/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from "crypto"
import { getPrismaClient } from "./prisma"
import { normalizePhoneNumberToAccountNumber } from "./phoneNormalization"

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex")
}

function getTwilioFriendlyErrorMessage(data: any): string {
  const rawMessage = data?.message || data?.error_message || data?.details || "Twilio API request failed."
  const lower = String(rawMessage).toLowerCase()

  if (lower.includes("trial account") || lower.includes("not available on a trial account") || lower.includes("upgrade your account to gain access")) {
    return "Phone verification is unavailable because the Twilio account is in trial mode. Upgrade the Twilio account or verify the destination phone number before sending OTPs."
  }

  if (lower.includes("not a valid phone number") || lower.includes("invalid phone number")) {
    return "The phone number entered is not valid for SMS verification. Please check the number and try again."
  }

  return rawMessage
}

/**
 * Normalizes a Nigerian or international phone number to E.164 standard.
 * e.g., "08012345678" -> "+2348012345678"
 * e.g., "2348012345678" -> "+2348012345678"
 */
export function formatToE164(phone: string): string {
  const trimmed = phone.trim()
  if (!trimmed) return ""

  // If already starts with '+', remove all non-digits except leading '+'
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
 * Dispatches real SMS message through the active provider.
 * Prefer Termii and fall back to Twilio only if Termii credentials are absent.
 */
export async function dispatchTwilioSms(
  toPhone: string,
  messageBody: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const e164Phone = formatToE164(toPhone)

  const termiiApiKey = process.env.TERMII_API_KEY
  const termiiSenderId = process.env.TERMII_SENDER_ID?.trim()
  const termiiBaseUrl = process.env.TERMII_BASE_URL || "https://api.ng.termii.com/api/sms/send"

  if (termiiApiKey && termiiSenderId) {
    try {
      const termiiPhone = e164Phone.replace("+", "")
      const sanitizedMessage = String(messageBody || "").replace(/[<>]/g, "").trim()
      const senderId = termiiSenderId.replace(/[^a-zA-Z0-9]/g, "")

      const payloads = [
        { api_key: termiiApiKey, to: termiiPhone, from: senderId, message: sanitizedMessage, type: "plain", channel: "generic" },
        { api_key: termiiApiKey, to: termiiPhone, from: senderId, sms: sanitizedMessage, type: "plain", channel: "generic" },
        { api_key: termiiApiKey, to: termiiPhone, from: senderId, message: sanitizedMessage },
        { api_key: termiiApiKey, to: termiiPhone, from: senderId, sms: sanitizedMessage },
      ]

      let lastError = "Termii SMS delivery failed."

      for (const payload of payloads) {
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
        const success =
          res.ok &&
          (data?.code === 200 ||
            data?.code === "200" ||
            data?.status === "success" ||
            data?.status === "SUCCESS" ||
            responseText.toLowerCase().includes("success") ||
            responseText.toLowerCase().includes("sent"))

        if (success) {
          console.log(`[Termii SMS Gateway]: Dispatched SMS to ${e164Phone}. Response: ${JSON.stringify(data)}`)
          return { success: true, sid: data?.message || data?.code || "termii-sms" }
        }

        lastError = data?.message || data?.error || data?.response || "One or more fields failed validation."
        console.warn(`[Termii SMS Gateway]: validation attempt failed for ${e164Phone}. Payload: ${JSON.stringify(payload)} Response: ${JSON.stringify(data)}`)
      }

      console.error(`[Termii SMS Gateway Error]: Failed to dispatch SMS to ${e164Phone}. ${lastError}`)
      return { success: false, error: lastError }
    } catch (err: any) {
      const errorMsg = err?.message || "Network exception during Termii SMS dispatch."
      console.error(`[Termii SMS Gateway Exception]: ${errorMsg}`)
      return { success: false, error: errorMsg }
    }
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromPhone = process.env.TWILIO_PHONE_NUMBER
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID

  if (!accountSid || !authToken || (!fromPhone && !messagingServiceSid)) {
    console.warn(
      `[Twilio SMS Gateway Notice]: Twilio credentials missing in environment variables. SMS for ${e164Phone} not dispatched.`
    )
    return {
      success: false,
      error: "SMS provider credentials are not configured. Please add Termii credentials or configure Twilio.",
    }
  }

  try {
    const params = new URLSearchParams()
    params.append("To", e164Phone)
    params.append("Body", messageBody)

    if (messagingServiceSid) {
      params.append("MessagingServiceSid", messagingServiceSid)
    } else if (fromPhone) {
      params.append("From", formatToE164(fromPhone))
    }

    const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64")

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    )

    const data = await res.json()

    if (res.ok && data?.sid) {
      console.log(
        `[Twilio SMS Gateway]: Dispatched SMS to ${e164Phone}. SID: ${data.sid}, Status: ${data.status}`
      )
      return { success: true, sid: data.sid }
    } else {
      const errorMsg = getTwilioFriendlyErrorMessage(data)
      console.error(`[Twilio SMS Gateway Error]: Failed to dispatch SMS to ${e164Phone}. ${data?.message || data?.error_message || "Twilio API dispatch failed."}`)
      return { success: false, error: errorMsg }
    }
  } catch (err: any) {
    const errorMsg = err?.message || "Network exception during Twilio SMS dispatch."
    console.error(`[Twilio SMS Gateway Exception]: ${errorMsg}`)
    return { success: false, error: errorMsg }
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

  const plainOtp = Math.floor(100000 + Math.random() * 900000).toString()
  const hashed = hashOtp(plainOtp)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
  const resendCooldown = new Date(Date.now() + 60 * 1000)

  const smsBody = `BankSpace Security: Your verification code is ${plainOtp}. It expires in 10 minutes. Do not share this code with anyone.`
  const twilioResult = await dispatchTwilioSms(formattedPhone, smsBody)

  if (!twilioResult.success) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[BankSpace SMS Gateway Dev Fallback]: OTP for ${formattedPhone} is ${plainOtp}`)
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
      return {
        success: true,
        message: `OTP generated successfully for local testing. Check server logs for the code.`,
        cooldownSeconds: 60,
      }
    }

    throw new Error(twilioResult.error || "SMS delivery failed. Please ensure your Twilio setup is configured correctly.")
  }

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

  const maskedPhone = formattedPhone.length > 6 ? formattedPhone.slice(0, 3) + "***" + formattedPhone.slice(-4) : "***"
  console.log(`[BankSpace SMS Gateway]: Real Twilio SMS OTP delivered to ${e164Phone} (SID: ${twilioResult.sid})`)

  return {
    success: true,
    message: `OTP sent successfully to ${maskedPhone}. Expires in 10 minutes.`,
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
    // Fallback simulation mode
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
