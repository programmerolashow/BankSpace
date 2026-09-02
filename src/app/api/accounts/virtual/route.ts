import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { provisionDedicatedVirtualAccount } from "@/lib/paystackDvaService"
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

    // Auto-provision or fetch Dedicated Virtual Account (DVA) NUBAN
    const dvaResult = await provisionDedicatedVirtualAccount(user.id)

    return NextResponse.json({
      success: true,
      bankSpaceAccountNumber: primaryAccount.accountNumber,
      externalDvaNuban: dvaResult.dvaNuban,
      externalBankName: dvaResult.dvaBankName,
      virtualAccount: {
        accountNumber: dvaResult.dvaNuban,
        accountName: (primaryAccount.accountName || user.name).toUpperCase(),
        bankName: dvaResult.dvaBankName,
        bankCode: "035",
        bankSpaceAccountNumber: primaryAccount.accountNumber,
        providerName: dvaResult.dvaProvider,
        currency: "NGN",
        status: primaryAccount.status,
      },
    })
  } catch (err) {
    return apiInternalError(err)
  }
}
