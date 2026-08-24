/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { logAuditEvent } from "@/lib/audit"
import { apiUnauthorized, apiBadRequest, apiInternalError } from "@/lib/errors"

const USD_TO_NGN_RATE = 1600.0

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

    const { symbol, amountUsd } = await request.json()

    if (!symbol || !amountUsd || Number(amountUsd) <= 0) {
      return apiBadRequest("Invalid asset symbol or investment amount.")
    }

    const usdAmount = Number(amountUsd)
    const ngnAmount = usdAmount * USD_TO_NGN_RATE
    const { client } = getPrismaClient()
    const referenceKey = "INV_" + Date.now() + "_" + Math.floor(1000 + Math.random() * 9000)

    if (client.bankAccount && typeof client.$transaction === "function") {
      try {
        await client.$transaction(async (tx: any) => {
          const primaryAcc = await tx.bankAccount.findFirst({
            where: { userId: user.id, isPrimary: true },
          })

          if (!primaryAcc) {
            throw new Error("No active primary bank account found.")
          }

          // Atomic Balance Decrement Guard: Prevents overdraft!
          const decResult = await tx.bankAccount.updateMany({
            where: {
              id: primaryAcc.id,
              balance: { gte: ngnAmount },
              status: "ACTIVE",
            },
            data: {
              balance: { decrement: ngnAmount },
            },
          })

          if (decResult.count === 0) {
            throw new Error(`Insufficient funds in primary wallet. Available balance: ₦${primaryAcc.balance.toLocaleString()}. Required: ₦${ngnAmount.toLocaleString()}`)
          }

          const updatedAcc = await tx.bankAccount.findUnique({
            where: { id: primaryAcc.id },
          })

          // Create Unified Transaction Record
          const transactionRecord = await tx.transaction.create({
            data: {
              reference: referenceKey,
              senderAccountId: primaryAcc.id,
              senderName: user.name,
              recipientName: `${symbol} Asset Purchase`,
              bankName: "Global Capital Markets",
              accountNumber: primaryAcc.accountNumber,
              amount: ngnAmount,
              fee: 0.0,
              currency: "NGN",
              type: "INVESTMENT_PURCHASE",
              category: "Investments",
              status: "SUCCESSFUL",
              description: `Investment purchase of $${usdAmount} in ${symbol} (₦${ngnAmount.toLocaleString()})`,
            },
          })

          // Create Double-Entry Ledger Entry
          if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
            await tx.ledgerEntry.create({
              data: {
                transactionId: transactionRecord.id,
                bankAccountId: primaryAcc.id,
                entryType: "DEBIT",
                amount: ngnAmount,
                balanceAfter: updatedAcc?.balance || 0.0,
              },
            })
          }
        })
      } catch (txErr) {
        const msg = txErr instanceof Error ? txErr.message : "Investment purchase failed"
        if (msg.includes("Insufficient funds")) {
          return apiBadRequest(msg)
        }
        return apiInternalError(txErr)
      }
    }

    // Trigger Notification & Audit Event
    await createNotification(
      user.id,
      "Investment Order Filled 📈",
      `Successfully purchased $${usdAmount.toLocaleString()} worth of ${symbol} assets.`,
      "SUCCESS"
    )

    await logAuditEvent(user.id, "WALLET_DEBIT", `Purchased $${usdAmount} worth of ${symbol}`)

    return NextResponse.json({
      success: true,
      message: `Successfully purchased $${usdAmount.toLocaleString()} worth of ${symbol}.`,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}
