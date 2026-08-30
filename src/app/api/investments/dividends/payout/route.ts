/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { logAuditEvent } from "@/lib/audit"
import {
  apiUnauthorized,
  apiForbidden,
  apiBadRequest,
  apiNotFound,
  apiInternalError,
} from "@/lib/errors"

export async function POST(request: Request) {
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

    const body = await request.json()
    const { holdingId, dividendAmount, description } = body

    const amount = Number(dividendAmount)
    if (!holdingId || isNaN(amount) || amount <= 0) {
      return apiBadRequest("Holding ID and a valid positive dividend amount are required.")
    }

    const { client } = getPrismaClient()
    const referenceKey = `INV_DIV_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`

    let updatedHolding: any = null
    let updatedPrimaryWallet: any = null
    let transactionRecord: any = null

    if (client.bankAccount && client.investmentHolding && typeof client.$transaction === "function") {
      try {
        const result = await client.$transaction(async (tx: any) => {
          const holding = await tx.investmentHolding.findUnique({
            where: { id: holdingId },
            include: { product: true },
          })

          if (!holding) {
            throw new Error("NOT_FOUND: Investment holding position not found.")
          }

          if (holding.userId !== user.id) {
            throw new Error("FORBIDDEN: You do not have permission to claim dividends for this holding.")
          }

          if (holding.status !== "ACTIVE" && holding.status !== "MATURED") {
            throw new Error(`BAD_REQUEST: Dividends can only be paid out on active or matured holdings. Current status: ${holding.status}`)
          }

          const primaryAcc = await tx.bankAccount.findFirst({
            where: { userId: user.id, isPrimary: true },
          })

          if (!primaryAcc) {
            throw new Error("No active primary bank account found for user.")
          }

          // Credit Primary Liquid Wallet
          const updatedPrimary = await tx.bankAccount.update({
            where: { id: primaryAcc.id },
            data: { balance: { increment: amount } },
          })

          // Update Holding Total Returns & Accumulated Returns
          const updatedH = await tx.investmentHolding.update({
            where: { id: holding.id },
            data: {
              totalReturns: { increment: amount },
            },
          })

          // Create Transaction Record (INVESTMENT_DIVIDEND)
          const txRecord = await tx.transaction.create({
            data: {
              reference: referenceKey,
              senderAccountId: primaryAcc.id,
              senderName: holding.product?.name || "Investment Dividend",
              recipientName: user.name,
              bankName: "BankSpace Asset Management",
              accountNumber: primaryAcc.accountNumber,
              amount,
              fee: 0.0,
              currency: "NGN",
              type: "INVESTMENT_DIVIDEND",
              category: "Investments",
              status: "SUCCESSFUL",
              description: description || `Dividend payout for ${holding.product?.name || "Investment Holding"}`,
            },
          })

          // Create Double-Entry Ledger Entry (CREDIT)
          if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
            await tx.ledgerEntry.create({
              data: {
                transactionId: txRecord.id,
                bankAccountId: primaryAcc.id,
                entryType: "CREDIT",
                amount,
                balanceAfter: updatedPrimary.balance,
              },
            })
          }

          return { updatedH, updatedPrimary, txRecord }
        })

        updatedHolding = result.updatedH
        updatedPrimaryWallet = result.updatedPrimary
        transactionRecord = result.txRecord
      } catch (txErr) {
        const msg = txErr instanceof Error ? txErr.message : "Dividend payout failed"
        if (msg.startsWith("NOT_FOUND:")) return apiNotFound(msg.replace("NOT_FOUND: ", ""))
        if (msg.startsWith("FORBIDDEN:")) return apiForbidden(msg.replace("FORBIDDEN: ", ""))
        if (msg.startsWith("BAD_REQUEST:")) return apiBadRequest(msg.replace("BAD_REQUEST: ", ""))
        return apiInternalError(txErr)
      }
    }

    await createNotification(
      user.id,
      "Dividend Paid Out 💵",
      `Dividend payout of ₦${amount.toLocaleString()}.00 credited to your primary checking wallet.`,
      "SUCCESS"
    )

    await logAuditEvent(
      user.id,
      "WALLET_CREDIT",
      `Received ₦${amount} dividend payout from investment holding ${holdingId}`
    )

    return NextResponse.json({
      success: true,
      message: `Dividend payout of ₦${amount.toLocaleString()} successfully credited.`,
      dividendAmount: amount,
      primaryWalletBalance: updatedPrimaryWallet?.balance,
      holding: updatedHolding,
      transaction: transactionRecord,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}
