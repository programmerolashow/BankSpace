import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { apiUnauthorized, apiInternalError } from "@/lib/errors"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return apiUnauthorized()
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return apiUnauthorized(error || "Invalid or expired session")
    }

    const { client } = getPrismaClient()
    const primaryAccount = await client.bankAccount.findFirst({
      where: { userId: user.id, isPrimary: true },
    })

    if (!primaryAccount) {
      return NextResponse.json({
        success: false,
        message: "No primary bank account found for user",
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      virtualAccount: {
        accountNumber: primaryAccount.accountNumber,
        accountName: primaryAccount.accountName || user.name,
        bankName: "BankSpace Microfinance Bank",
        bankCode: "000000",
        providerName: "BankSpace / Paystack Titan",
        currency: "NGN",
        status: primaryAccount.status,
      },
    })
  } catch (err) {
    return apiInternalError(err)
  }
}
