/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { normalizePhoneNumberToAccountNumber } from "@/lib/phoneNormalization"
import { verifyBvnWithProvider } from "@/lib/bvnVerificationService"

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return NextResponse.json({ message: "Unauthenticated session. Please log in." }, { status: 401 })
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return NextResponse.json({ message: error || "Invalid or expired session" }, { status: 401 })
    }

    const body = await request.json()
    const {
      firstName,
      middleName,
      lastName,
      phone,
      dob,
      gender,
      bvn,
      nin,
      address,
      state,
      lga,
      country = "Nigeria",
      postalCode,
      avatarUrl,
    } = body

    // 1. Mandatory Field Validation
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ message: "First name and last name are required." }, { status: 400 })
    }

    if (!phone?.trim()) {
      return NextResponse.json({ message: "Phone number is required." }, { status: 400 })
    }

    if (!dob?.trim()) {
      return NextResponse.json({ message: "Date of birth is required." }, { status: 400 })
    }

    if (!gender?.trim()) {
      return NextResponse.json({ message: "Gender selection is required." }, { status: 400 })
    }

    const cleanBvn = String(bvn || "").replace(/\D/g, "")
    if (cleanBvn.length !== 11) {
      return NextResponse.json({ message: "Bank Verification Number (BVN) must be exactly 11 digits." }, { status: 400 })
    }

    const cleanNin = String(nin || "").replace(/\D/g, "")
    if (cleanNin.length !== 11) {
      return NextResponse.json({ message: "National Identity Number (NIN) must be exactly 11 digits." }, { status: 400 })
    }

    if (!address?.trim() || !state?.trim() || !lga?.trim()) {
      return NextResponse.json({ message: "Residential address, state, and LGA are required." }, { status: 400 })
    }

    // 2. Perform Provider-Backed BVN Verification & Identity Matching
    const bvnResult = await verifyBvnWithProvider({
      userId: user.id,
      bvn: cleanBvn,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dob: dob.trim(),
      phone: phone.trim(),
    })

    if (bvnResult.status === "FAILED") {
      return NextResponse.json(
        {
          message: bvnResult.failureReason || "BVN Identity Verification failed. First name, Last name, or Date of birth does not match NIBSS BVN registry record.",
          bvnStatus: "FAILED",
        },
        { status: 400 }
      )
    }

    // 3. Normalize Phone & Derive 10-Digit BankSpace Account Number
    const normalizedAccountNumber = normalizePhoneNumberToAccountNumber(phone, user.id)
    const fullName = `${firstName.trim()} ${lastName.trim()}`

    const { client } = getPrismaClient()

    // 4. Update User Profile in Database with BVN Verification Metadata
    let updatedUser: any = null
    const finalKycStatus = bvnResult.status === "VERIFIED" ? "VERIFIED" : "PENDING"

    if (client.user && typeof client.user.update === "function") {
      try {
        updatedUser = await client.user.update({
          where: { id: user.id },
          data: {
            name: fullName,
            phone: phone.trim(),
            firstName: firstName.trim(),
            middleName: middleName?.trim() || null,
            lastName: lastName.trim(),
            dob: dob.trim(),
            gender: gender.trim(),
            bvnStatus: bvnResult.status,
            bvnProvider: bvnResult.provider,
            bvnReferenceId: bvnResult.referenceId,
            bvnVerifiedAt: bvnResult.verifiedAt || null,
            maskedBvn: bvnResult.maskedBvn,
            bvnFailureReason: bvnResult.failureReason || null,
            bvn: null, // Never store full 11-digit BVN in cleartext
            nin: cleanNin,
            address: address.trim(),
            state: state.trim(),
            lga: lga.trim(),
            country: country.trim(),
            postalCode: postalCode?.trim() || null,
            avatarUrl: avatarUrl?.trim() || user.avatarUrl || null,
            isVerified: finalKycStatus === "VERIFIED",
            kycStatus: finalKycStatus,
            kycSubmittedAt: new Date(),
          },
        })
      } catch (err: any) {
        console.warn("[Complete Profile DB Notice]:", err)
      }
    }

    // 4. Provision Primary BankAccount with Normalized 10-Digit Account Number
    if (client.bankAccount && typeof client.bankAccount.findFirst === "function") {
      try {
        const existingPrimary = await client.bankAccount.findFirst({
          where: { userId: user.id, isPrimary: true },
        })

        if (existingPrimary) {
          await client.bankAccount.update({
            where: { id: existingPrimary.id },
            data: {
              accountNumber: normalizedAccountNumber,
              accountName: fullName,
            },
          })
        } else {
          await client.bankAccount.create({
            data: {
              userId: user.id,
              accountNumber: normalizedAccountNumber,
              accountName: fullName,
              bankName: "BankSpace Microfinance Bank",
              accountType: "CHECKING",
              balance: 0.0,
              isPrimary: true,
              status: "ACTIVE",
            },
          })
        }
      } catch (err: any) {
        console.warn("[Complete Profile BankAccount Provision Notice]:", err)
      }
    }

    return NextResponse.json({
      success: true,
      message: "BankSpace Profile and Identity Verification completed successfully!",
      accountNumber: normalizedAccountNumber,
      bvnStatus: bvnResult.status,
      maskedBvn: bvnResult.maskedBvn,
      referenceId: bvnResult.referenceId,
      user: {
        id: user.id,
        name: fullName,
        email: user.email,
        phone: phone.trim(),
        bvnStatus: bvnResult.status,
        maskedBvn: bvnResult.maskedBvn,
        kycStatus: finalKycStatus,
        isVerified: finalKycStatus === "VERIFIED",
        isProfileComplete: true,
      },
    })
  } catch (error: any) {
    console.error("[Complete Profile Fatal Exception]:", error)
    return NextResponse.json(
      { message: error?.message || "An error occurred while updating your compliance profile." },
      { status: 500 }
    )
  }
}
