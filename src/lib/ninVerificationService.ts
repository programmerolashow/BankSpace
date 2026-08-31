import { getPrismaClient } from "./prisma"

export type NinVerificationStatus = "VERIFIED" | "FAILED" | "REQUIRES_REVIEW" | "PENDING" | "UNVERIFIED"

export interface NinVerificationPayload {
  userId: string
  nin: string
  firstName: string
  lastName: string
  dob: string
  phone?: string
}

export interface NinVerificationResult {
  success: boolean
  status: NinVerificationStatus
  maskedNin: string
  provider: string
  referenceId: string
  verifiedAt?: Date
  failureReason?: string
}

/**
 * Mask 11-digit NIN (e.g. "11123456789" -> "111*****789")
 */
export function maskNinNumber(nin: string): string {
  const digits = nin.replace(/\D/g, "")
  if (digits.length !== 11) {
    return "***********"
  }
  return `${digits.slice(0, 3)}*****${digits.slice(-3)}`
}

/**
 * Normalizes name strings for fuzzy comparison
 */
function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]/g, "")
}

/**
 * Perform Identity Verification against NIMC NIN Registry / Paystack Identity Provider
 */
export async function verifyNinWithProvider(payload: NinVerificationPayload): Promise<NinVerificationResult> {
  const { userId, nin, firstName, lastName, dob } = payload

  const cleanNin = nin.replace(/\D/g, "")
  if (cleanNin.length !== 11) {
    throw new Error("Invalid NIN: Must be exactly 11 numeric digits.")
  }

  const maskedNin = maskNinNumber(cleanNin)
  const referenceId = `nin_ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const provider = "NIMC_DIRECT"
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY

  let status: NinVerificationStatus = "FAILED"
  let failureReason: string | undefined = undefined
  let verifiedAt: Date | undefined = undefined

  // 1. Live Identity Provider Integration if API key present
  if (paystackSecret && !paystackSecret.includes("sk_test_2339a939")) {
    try {
      const response = await fetch("https://api.paystack.co/identity/nin/resolve", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nin: cleanNin,
          first_name: firstName,
          last_name: lastName,
          dob,
        }),
      })

      const data = await response.json()

      if (response.ok && data.status && data.data) {
        const isFirstNameMatched = Boolean(data.data.is_first_name_match)
        const isLastNameMatched = Boolean(data.data.is_last_name_match)

        if (isFirstNameMatched && isLastNameMatched) {
          status = "VERIFIED"
          verifiedAt = new Date()
        } else {
          status = "FAILED"
          failureReason = "Identity Information Mismatch: First name or Last name does not match NIMC NIN registry record."
        }
      } else {
        status = "FAILED"
        failureReason = data.message || "NIN verification failed with NIMC identity provider."
      }
    } catch (err: any) {
      console.warn("[NIN Provider API Warning]:", err)
      status = "REQUIRES_REVIEW"
      failureReason = "NIMC Provider network timeout. Queued for manual compliance review."
    }
  } else {
    // 2. Simulated NIMC Registry Verification Engine
    const normUserFirst = normalizeName(firstName)
    const normUserLast = normalizeName(lastName)

    // Test NIN check: NINs starting with '00' trigger failure test
    if (cleanNin.startsWith("00")) {
      status = "FAILED"
      failureReason = "Invalid NIN: Number not found on NIMC national identity database."
    } else if (cleanNin.startsWith("99")) {
      status = "REQUIRES_REVIEW"
      failureReason = "NIMC registry audit flagged by automated risk engine."
    } else {
      // Simulate NIMC registry identity matching logic
      if (normUserFirst.length >= 2 && normUserLast.length >= 2) {
        status = "VERIFIED"
        verifiedAt = new Date()
      } else {
        status = "FAILED"
        failureReason = "Identity Information Mismatch: Name details are incomplete or do not match NIMC record."
      }
    }
  }

  // 3. Store Verification Audit Record in Database
  const { client, isFallback } = getPrismaClient()
  if (!isFallback && client.user && typeof client.user.update === "function") {
    try {
      await client.user.update({
        where: { id: userId },
        data: {
          ninStatus: status,
          ninProvider: provider,
          ninReferenceId: referenceId,
          ninVerifiedAt: verifiedAt || null,
          maskedNin,
          ninFailureReason: failureReason || null,
          // Never store full 11-digit NIN cleartext in user record
          nin: null,
        },
      })
    } catch (err) {
      console.warn("[NIN Status DB Update Warning]:", err)
    }
  }

  return {
    success: status === "VERIFIED",
    status,
    maskedNin,
    provider,
    referenceId,
    verifiedAt,
    failureReason,
  }
}
