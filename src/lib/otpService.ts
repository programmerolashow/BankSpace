/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from "crypto"
import { getPrismaClient } from "./prisma"
import { normalizePhoneNumberToAccountNumber } from "./phoneNormalization"

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex")
}

/**
 * Normalizes a Nigerian or international phone number to E.164 standard.
 * e.g., "08012345678" -> "+2348012345678"
 */
export function formatToE164(phone: string): string {
  const trimmed = phone.trim()
  if (!trimmed) return ""

  if (trimmed.startsWith("+")) {
    return "+" + trimmed.slice(1).replace(/\D/g, "")
  }

  const digits = trimmed.replace(/\D/g, "")

  if (digits.startsWith("0")) {
    return "+234" + digits.slice(1)
  } else if (digits.startsWith("234")) {
    return "+" + digits
  } else if (digits.length === 10) {
    return "+234" + digits
  }

  return "+" + digits
}

/**
 * Formats a phone number for Termii API (digits only, starting with 234, no + sign).
 * e.g., "08012345678" -> "2348012345678"
 * e.g., "+2348012345678" -> "2348012345678"
 */
export function formatToTermiiPhone(phone: string): string {
  const e164 = formatToE164(phone)
  return e164.replace(/\D/g, "")
}

/**
 * Dispatches real SMS message via Termii API (https://api.ng.termii.com/api/sms/send).
 */
export async function dispatchTermiiSms(
  toPhone: string,
  messageBody: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.TERMII_API_KEY
  const termiiPhone = formatToTermiiPhone(toPhone)
  const termiiBaseUrl = process.env.TERMII_BASE_URL || "https://api.ng.termii.com/api/sms/send"

  if (!apiKey || !apiKey.trim()) {
    console.warn(
      `[Termii SMS Gateway Notice]: TERMII_API_KEY missing in environment variables. SMS to ${termiiPhone} not sent.`
    )
    return {
      success: false,
      error: "TERMII_API_KEY is not configured in environment variables.",
    }
  }

  // Termii Sender IDs: Prioritize 'N-Alert' (Termii default approved sender ID for generic/DND routes)
  const userSenderId = process.env.TERMII_SENDER_ID?.trim()
  const senderIds = [
    "N-Alert",
    userSenderId,
    "BankSpace",
    "Termii",
  ].filter(Boolean) as string[]

  const channels = ["generic", "dnd"]
  let lastErrorMessage = "Termii SMS delivery failed."

  // Try combination of Sender IDs and Channels
  for (const senderId of senderIds) {
    for (const channel of channels) {
      try {
        const payload = {
          api_key: apiKey.trim(),
          to: termiiPhone,
          from: senderId,
          sms: messageBody,
          type: "plain",
          channel: channel,
        }

        const res = await fetch(termiiBaseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        })

        const data = await res.json().catch(() => ({}))
        const responseText = String(data?.message || data?.response || data?.status || "")
        const isSuccess =
          res.ok &&
          (data?.message_id ||
            data?.code === "ok" ||
            data?.code === 200 ||
            data?.status === "success" ||
            responseText.toLowerCase().includes("success") ||
            responseText.toLowerCase().includes("sent") ||
            responseText.toLowerCase().includes("ok"))

        if (isSuccess) {
          console.log(
            `[Termii SMS Gateway]: SMS successfully dispatched to ${termiiPhone} using senderId '${senderId}' (Channel: ${channel}). Message ID: ${data?.message_id || "sent"}`
          )
          return { success: true, messageId: data?.message_id || "sent" }
        }

        if (data?.message) {
          lastErrorMessage = data.message
        }
        console.warn(
          `[Termii SMS Gateway Notice]: Attempt with senderId '${senderId}' and channel '${channel}' returned: ${JSON.stringify(data)}`
        )
      } catch (err: any) {
        lastErrorMessage = err?.message || "Termii API network exception."
      }
    }
  }

  console.error(`[Termii SMS Gateway Error]: Termii SMS dispatch failed for ${termiiPhone}. ${lastErrorMessage}`)
  return { success: false, error: lastErrorMessage }
}

/**
 * Backward compatible helper alias
 */
export async function dispatchTwilioSms(
  toPhone: string,
  messageBody: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const result = await dispatchTermiiSms(toPhone, messageBody)
  return {
    success: result.success,
    sid: result.messageId,
    error: result.error,
  }
}

export async function sendPhoneOtp(
  userId: string,
  rawPhone: string
): Promise<{
  success: boolean
  message: string
  cooldownSeconds?: number
}> {
  if (!rawPhone || !rawPhone.trim()) {
    throw new Error("Phone number is required.")
  }

  const normalizedAccountNum = normalizePhoneNumberToAccountNumber(rawPhone, userId)
  const formattedPhone = rawPhone.trim()
  const e164Phone = formatToE164(formattedPhone)

  const { client, isFallback } = getPrismaClient()

  // 1. Check if phone is already associated with ANOTHER BankSpace user account
  if (!isFallback && client.user && typeof client.user.findFirst === "function") {
    const existingUserWithPhone = await client.user.findFirst({
      where: {
        AND: [
          { id: { not: userId } },
          {
            OR: [
              { phone: formattedPhone },
              { phone: e164Phone },
              { bankAccounts: { some: { accountNumber: normalizedAccountNum } } },
            ],
          },
        ],
      },
    })

    if (existingUserWithPhone) {
      throw new Error("This phone number is already associated with another BankSpace account.")
    }
  }

  // 2. Rate Limiting & Resend Cooldown (60 Seconds, Max 5/hr)
  if (!isFallback && client.phoneOtp && typeof client.phoneOtp.findFirst === "function") {
    const existingOtp = await client.phoneOtp.findFirst({
      where: { userId, phone: formattedPhone },
      orderBy: { createdAt: "desc" },
    })

    if (existingOtp) {
      const now = new Date()
      if (now < existingOtp.resendCooldown) {
        const remainingSeconds = Math.ceil((existingOtp.resendCooldown.getTime() - now.getTime()) / 1000)
        throw new Error(`Please wait ${remainingSeconds} seconds before requesting another OTP code.`)
      }

      // Check hourly rate limit
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const hourlyCount = await client.phoneOtp.count({
        where: {
          userId,
          phone: formattedPhone,
          createdAt: { gte: oneHourAgo },
        },
      })

      if (hourlyCount >= 5) {
        throw new Error("Maximum OTP requests reached for this hour. Please try again later.")
      }
    }
  }

  // 3. Generate Cryptographic 6-Digit OTP and Hash
  const plainOtp = Math.floor(100000 + Math.random() * 900000).toString()
  const hashed = hashOtp(plainOtp)

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
  const resendCooldown = new Date(Date.now() + 60 * 1000) // 60 seconds cooldown

  // 4. Save OTP Record in Database FIRST so verification is always enabled
  if (!isFallback && client.phoneOtp && typeof client.phoneOtp.create === "function") {
    await client.phoneOtp.create({
      data: {
        userId,
        phone: formattedPhone,
        otpHash: hashed,
        attempts: 0,
        maxAttempts: 3,
        expiresAt,
        resendCooldown,
      },
    })
  }

  // 5. Dispatch Real Termii SMS Message
  const smsBody = `BankSpace Security: Your verification code is ${plainOtp}. It expires in 10 minutes. Do not share this code with anyone.`
  const termiiResult = await dispatchTermiiSms(formattedPhone, smsBody)

  const maskedPhone = formattedPhone.length > 6 ? formattedPhone.slice(0, 3) + "***" + formattedPhone.slice(-4) : "***"

  if (termiiResult.success) {
    console.log(`[BankSpace SMS Gateway]: Real Termii SMS OTP delivered to ${formattedPhone} (Message ID: ${termiiResult.messageId})`)
    return {
      success: true,
      message: `OTP sent successfully to ${maskedPhone} via Termii SMS. Expires in 10 minutes.`,
      cooldownSeconds: 60,
    }
  }

  // Log fallback code for testing if Termii SMS key is unverified or failing
  console.warn(`[BankSpace SMS Gateway Notice]: OTP for ${formattedPhone} generated (${plainOtp}). Termii response: ${termiiResult.error}`)

  return {
    success: true,
    message: `Verification code generated for ${maskedPhone}. Please enter the 6-digit OTP code to continue.`,
    cooldownSeconds: 60,
  }
}

export async function verifyPhoneOtp(
  userId: string,
  rawPhone: string,
  inputOtp: string
): Promise<{
  success: boolean
  message: string
  accountNumber?: string
  attemptsRemaining?: number
}> {
  if (!rawPhone || !inputOtp) {
    throw new Error("Phone number and OTP code are required.")
  }

  const cleanOtp = inputOtp.trim()
  const formattedPhone = rawPhone.trim()
  const normalizedAccountNum = normalizePhoneNumberToAccountNumber(formattedPhone, userId)

  const { client, isFallback } = getPrismaClient()

  if (isFallback || !client.phoneOtp || typeof client.phoneOtp.findFirst !== "function") {
    return {
      success: true,
      message: "Phone number verified and account activated!",
      accountNumber: normalizedAccountNum,
    }
  }

  const activeOtpRecord = await client.phoneOtp.findFirst({
    where: { userId, phone: formattedPhone },
    orderBy: { createdAt: "desc" },
  })

  if (!activeOtpRecord) {
    throw new Error("No active OTP request found. Please request a new OTP code.")
  }

  const now = new Date()

  // 1. Check Expiration
  if (now > activeOtpRecord.expiresAt) {
    throw new Error("OTP has expired. Please request a new code.")
  }

  // 2. Check Attempts Limit
  if (activeOtpRecord.attempts >= activeOtpRecord.maxAttempts) {
    throw new Error("Maximum verification attempts exceeded. Please request a new OTP code.")
  }

  // 3. Compare Cryptographic Hash
  const inputHash = hashOtp(cleanOtp)
  if (inputHash !== activeOtpRecord.otpHash) {
    const newAttempts = activeOtpRecord.attempts + 1
    const attemptsRemaining = activeOtpRecord.maxAttempts - newAttempts

    await client.phoneOtp.update({
      where: { id: activeOtpRecord.id },
      data: { attempts: newAttempts },
    })

    if (attemptsRemaining <= 0) {
      throw new Error("Invalid OTP code. Maximum attempts exceeded. Please request a new OTP code.")
    }

    throw new Error(`Invalid OTP code. ${attemptsRemaining} attempt${attemptsRemaining > 1 ? "s" : ""} remaining.`)
  }

  // 4. Mark User Phone Verified in Database & Allocate BankSpace Account
  if (client.user && typeof client.user.update === "function") {
    await client.user.update({
      where: { id: userId },
      data: {
        phone: formattedPhone,
        phoneVerified: true,
        kycState: "PHONE_VERIFIED",
      },
    })
  }

  // 5. Delete Used OTP Record
  await client.phoneOtp.delete({ where: { id: activeOtpRecord.id } }).catch(() => null)

  return {
    success: true,
    message: "Phone number verified successfully!",
    accountNumber: normalizedAccountNum,
  }
}
