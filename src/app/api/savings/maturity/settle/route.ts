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
    const { savingsAccountId, action } = body

    if (!savingsAccountId || !action) {
      return apiBadRequest("Savings account ID and settlement action (WITHDRAW or ROLLOVER) are required.")
    }

    const settlementAction = String(action).toUpperCase()
    if (!["WITHDRAW", "ROLLOVER"].includes(settlementAction)) {
      return apiBadRequest("Invalid settlement action. Must be 'WITHDRAW' or 'ROLLOVER'.")
    }

    const { client } = getPrismaClient()
    const referenceKey = `SAV_MAT_${settlementAction}_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`

    let updatedSavingsAccount: any = null
    let updatedPrimaryWallet: any = null
    let transactionRecord: any = null

    if (client.bankAccount && client.savingsAccount && typeof client.$transaction === "function") {
      try {
        const result = await client.$transaction(async (tx: any) => {
          const primaryAcc = await tx.bankAccount.findFirst({
            where: { userId: user.id, isPrimary: true },
          })

          if (!primaryAcc) {
            throw new Error("No active primary bank account found for user.")
          }

          const savingsAcc = await tx.savingsAccount.findUnique({
            where: { id: savingsAccountId },
          })

          if (!savingsAcc) {
            throw new Error("NOT_FOUND: Savings account not found.")
          }

          if (savingsAcc.userId !== user.id) {
            throw new Error("FORBIDDEN: You do not have permission to settle this savings account.")
          }

          if (savingsAcc.status !== "MATURED") {
            throw new Error(`BAD_REQUEST: Only MATURED fixed deposits can be settled via maturity API. Current status: ${savingsAcc.status}`)
          }

          const totalBalance = savingsAcc.currentBalance || 0.0

          if (settlementAction === "WITHDRAW") {
            // Credit Primary Liquid Wallet with 0 Penalty Fee!
            const updatedPrimary = await tx.bankAccount.update({
              where: { id: primaryAcc.id },
              data: { balance: { increment: totalBalance } },
            })

            const updatedSavings = await tx.savingsAccount.update({
              where: { id: savingsAccountId },
              data: {
                status: "WITHDRAWN",
                currentBalance: 0.0,
                principal: 0.0,
              },
            })

            const txRecord = await tx.transaction.create({
              data: {
                reference: referenceKey,
                senderAccountId: primaryAcc.id,
                senderName: savingsAcc.title || "Fixed Deposit",
                recipientName: user.name,
                bankName: "BankSpace Microfinance Bank",
                accountNumber: primaryAcc.accountNumber,
                amount: totalBalance,
                fee: 0.0,
                currency: "NGN",
                type: "SAVINGS_WITHDRAWAL",
                category: "Savings",
                status: "SUCCESSFUL",
                description: `Maturity settlement payout for ${savingsAcc.title} (0 Penalty)`,
              },
            })

            if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
              await tx.ledgerEntry.create({
                data: {
                  transactionId: txRecord.id,
                  bankAccountId: primaryAcc.id,
                  entryType: "CREDIT",
                  amount: totalBalance,
                  balanceAfter: updatedPrimary.balance,
                },
              })
            }

            return { updatedSavings, updatedPrimary, txRecord }
          } else {
            // ROLLOVER: Extend maturity by 90 days and reset principal to total balance
            const newMaturity = new Date(Date.now() + 90 * 86400000)

            const updatedSavings = await tx.savingsAccount.update({
              where: { id: savingsAccountId },
              data: {
                status: "ROLLED_OVER",
                principal: totalBalance,
                maturityDate: newMaturity,
              },
            })

            return { updatedSavings, updatedPrimary: primaryAcc, txRecord: null }
          }
        })

        updatedSavingsAccount = result.updatedSavings
        updatedPrimaryWallet = result.updatedPrimary
        transactionRecord = result.txRecord
      } catch (txErr) {
        const msg = txErr instanceof Error ? txErr.message : "Maturity settlement failed"
        if (msg.startsWith("NOT_FOUND:")) return apiNotFound(msg.replace("NOT_FOUND: ", ""))
        if (msg.startsWith("FORBIDDEN:")) return apiForbidden(msg.replace("FORBIDDEN: ", ""))
        if (msg.startsWith("BAD_REQUEST:")) return apiBadRequest(msg.replace("BAD_REQUEST: ", ""))
        return apiInternalError(txErr)
      }
    }

    // Trigger Notification & Security Audit Event
    if (settlementAction === "WITHDRAW") {
      await createNotification(
        user.id,
        "Fixed Deposit Settled 💰",
        `Full matured principal + yield of ₦${updatedSavingsAccount?.currentBalance || updatedSavingsAccount?.principal || 0} credited to your checking account.`,
        "SUCCESS"
      )

      await logAuditEvent(
        user.id,
        "WALLET_CREDIT",
        `Settled matured fixed deposit ${savingsAccountId} to primary wallet.`
      )
    } else {
      await createNotification(
        user.id,
        "Fixed Deposit Rolled Over 🔄",
        `Your fixed deposit "${updatedSavingsAccount?.title}" has been rolled over into a new 90-day term.`,
        "SUCCESS"
      )

      await logAuditEvent(
        user.id,
        "TRANSACTION_SUCCESS",
        `Rolled over matured fixed deposit ${savingsAccountId} into new term.`
      )
    }

    return NextResponse.json({
      success: true,
      action: settlementAction,
      message: settlementAction === "WITHDRAW"
        ? "Matured fixed deposit successfully settled to your checking account."
        : "Matured fixed deposit successfully rolled over into a new lock term.",
      savingsAccount: updatedSavingsAccount,
      primaryWalletBalance: updatedPrimaryWallet?.balance,
      transaction: transactionRecord,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}
