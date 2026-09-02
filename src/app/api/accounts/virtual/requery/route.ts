import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { reconcileDvaAccount } from "@/lib/dvaReconciliationService"
import { apiUnauthorized, apiInternalError } from "@/lib/errors"

export async function POST() {
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
      return NextResponse.json(
        { success: false, message: "No primary bank account found for user" },
        { status: 404 }
      )
    }

    const targetNuban = primaryAccount.dvaNuban || primaryAccount.accountNumber

    // Execute Paystack DVA Requery & Unprocessed Webhook Reconciliation
    const report = await reconcileDvaAccount(targetNuban)

    return NextResponse.json({
      success: true,
      accountNumber: primaryAccount.accountNumber,
      dvaNuban: primaryAccount.dvaNuban || targetNuban,
      totalReconciledCount: report.totalReconciledCount,
      totalReconciledAmount: report.totalReconciledAmount,
      message: report.message,
      reconciledTransactions: report.reconciledTransactions,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}
