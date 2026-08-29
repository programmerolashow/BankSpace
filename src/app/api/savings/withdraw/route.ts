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
  apiConflict,
  apiInternalError,
} from "@/lib/errors"

export async function POST(request: Request) {
  try {
    // 1. Authenticate User Session
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return apiUnauthorized()
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return apiUnauthorized(error || "Invalid or expired session")
    }

    // 2. Read Idempotency Key
    const idempotencyKey =
      request.headers.get("x-idempotency-key") ||
      request.headers.get("idempotency-key") ||
      undefined

    const body = await request.json()
    const { savingsAccountId, goalId, amount, customReference } = body

    const targetSavingsId = savingsAccountId || goalId
    if (!targetSavingsId) {
      return apiBadRequest("Savings account ID or goal ID is required.")
    }

    const withdrawalAmount = Number(amount)
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      return apiBadRequest("Invalid withdrawal amount. Amount must be greater than ₦0.00.")
    }

    const referenceKey =
      idempotencyKey ||
      customReference ||
      `SAV_WTH_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`

    const { client } = getPrismaClient()

    // 3. Idempotency Check
    if (client.transaction && typeof client.transaction.findUnique === "function") {
      const existingTx = await client.transaction.findUnique({
        where: { reference: referenceKey },
      })
      if (existingTx) {
        return apiConflict("Duplicate request detected. Savings withdrawal already processed.", {
          transaction: existingTx,
        })
      }
    }

    let updatedSavingsAccount: any = null
    let updatedPrimaryWallet: any = null
    let transactionRecord: any = null
    let penaltyFee = 0.0
    let netAmountCredited = withdrawalAmount

    // 4. Prisma Interactive $Transaction (ATOMIC MUTEX)
    if (client.bankAccount && typeof client.$transaction === "function") {
      try {
        const result = await client.$transaction(async (tx: any) => {
          // Fetch Primary Liquid Wallet
          const primaryAcc = await tx.bankAccount.findFirst({
            where: { userId: user.id, isPrimary: true },
          })

          if (!primaryAcc) {
            throw new Error("No active primary bank account found for user.")
          }

          if (primaryAcc.status !== "ACTIVE") {
            throw new Error("Primary bank account is inactive or restricted.")
          }

          // Fetch Target Savings Account or Goal Vault
          let savingsAcc: any = null
          let isNewSavingsAccountModel = false

          if (tx.savingsAccount && typeof tx.savingsAccount.findUnique === "function") {
            savingsAcc = await tx.savingsAccount.findUnique({
              where: { id: targetSavingsId },
              include: { savingsProduct: true },
            })
            if (savingsAcc) isNewSavingsAccountModel = true
          }

          if (!savingsAcc && tx.savingsGoal && typeof tx.savingsGoal.findUnique === "function") {
            savingsAcc = await tx.savingsGoal.findUnique({
              where: { id: targetSavingsId },
            })
          }

          if (!savingsAcc) {
            throw new Error("NOT_FOUND: Target savings account or goal vault not found.")
          }

          if (savingsAcc.userId !== user.id) {
            throw new Error("FORBIDDEN: You do not have permission to withdraw from this savings account.")
          }

          if (savingsAcc.status === "CLOSED") {
            throw new Error("Target savings account is already closed.")
          }

          const currentBalance = isNewSavingsAccountModel
            ? savingsAcc.currentBalance || 0
            : savingsAcc.currentAmount || 0

          if (currentBalance < withdrawalAmount) {
            throw new Error(`INSUFFICIENT_SAVINGS: Insufficient funds in savings vault. Available: ₦${currentBalance.toLocaleString()}.00`)
          }

          // Evaluate Maturity & Early Withdrawal Penalty Rules
          const now = new Date()
          const isMatured = savingsAcc.maturityDate ? now >= new Date(savingsAcc.maturityDate) : true
          const earlyPenaltyPercent = savingsAcc.savingsProduct?.earlyPenaltyPercent || (isMatured ? 0.0 : 5.0) // 5% default early penalty if locked

          if (!isMatured && earlyPenaltyPercent > 0) {
            penaltyFee = Math.round(withdrawalAmount * (earlyPenaltyPercent / 100) * 100) / 100
            netAmountCredited = withdrawalAmount - penaltyFee
          }

          // ATOMIC BALANCE DECREMENT GUARD ON SAVINGS ACCOUNT: Prevents Overdraft / Race Conditions!
          if (isNewSavingsAccountModel) {
            const decResult = await tx.savingsAccount.updateMany({
              where: {
                id: targetSavingsId,
                currentBalance: { gte: withdrawalAmount },
              },
              data: {
                currentBalance: { decrement: withdrawalAmount },
                principal: { decrement: Math.min(savingsAcc.principal || 0, withdrawalAmount) },
              },
            })

            if (decResult.count === 0) {
              throw new Error("INSUFFICIENT_SAVINGS: Concurrent withdrawal conflict or insufficient savings balance.")
            }
          } else {
            const decResult = await tx.savingsGoal.updateMany({
              where: {
                id: targetSavingsId,
                currentAmount: { gte: withdrawalAmount },
              },
              data: {
                currentAmount: { decrement: withdrawalAmount },
              },
            })

            if (decResult.count === 0) {
              throw new Error("INSUFFICIENT_SAVINGS: Concurrent withdrawal conflict or insufficient goal balance.")
            }
          }

          // Credit Primary Liquid Wallet
          const updatedPrimary = await tx.bankAccount.update({
            where: { id: primaryAcc.id },
            data: { balance: { increment: netAmountCredited } },
          })

          // Fetch updated savings account state
          const updatedSavings = isNewSavingsAccountModel
            ? await tx.savingsAccount.findUnique({ where: { id: targetSavingsId } })
            : await tx.savingsGoal.findUnique({ where: { id: targetSavingsId } })

          // Update Status if balance fully drained
          const remainingBal = isNewSavingsAccountModel
            ? updatedSavings.currentBalance
            : updatedSavings.currentAmount

          if (remainingBal <= 0) {
            if (isNewSavingsAccountModel) {
              await tx.savingsAccount.update({
                where: { id: targetSavingsId },
                data: { status: "CLOSED" },
              })
            } else {
              await tx.savingsGoal.update({
                where: { id: targetSavingsId },
                data: { status: "ACTIVE" },
              })
            }
          }

          // Create Unified Transaction Record (SAVINGS_WITHDRAWAL)
          const txRecord = await tx.transaction.create({
            data: {
              reference: referenceKey,
              senderAccountId: primaryAcc.id,
              senderName: savingsAcc.title || savingsAcc.accountNumber || "Savings Vault",
              recipientName: user.name,
              bankName: "BankSpace Microfinance Bank",
              accountNumber: primaryAcc.accountNumber,
              amount: netAmountCredited,
              fee: penaltyFee,
              currency: "NGN",
              type: "SAVINGS_WITHDRAWAL",
              category: "Savings",
              status: "SUCCESSFUL",
              description: `Withdrawal from savings vault (${savingsAcc.title || "Savings Account"})${penaltyFee > 0 ? ` (Early Penalty Fee: ₦${penaltyFee.toFixed(2)})` : ""}`,
            },
          })

          // Create Double-Entry Ledger Entry (CREDIT to primary wallet)
          if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
            await tx.ledgerEntry.create({
              data: {
                transactionId: txRecord.id,
                bankAccountId: primaryAcc.id,
                entryType: "CREDIT",
                amount: netAmountCredited,
                balanceAfter: updatedPrimary.balance,
              },
            })
          }

          return { updatedSavings, updatedPrimary, txRecord }
        })

        updatedSavingsAccount = result.updatedSavings
        updatedPrimaryWallet = result.updatedPrimary
        transactionRecord = result.txRecord
      } catch (txErr) {
        const msg = txErr instanceof Error ? txErr.message : "Savings withdrawal failed"
        if (msg.startsWith("NOT_FOUND:")) return apiNotFound(msg.replace("NOT_FOUND: ", ""))
        if (msg.startsWith("FORBIDDEN:")) return apiForbidden(msg.replace("FORBIDDEN: ", ""))
        if (msg.startsWith("INSUFFICIENT_SAVINGS:") || msg.includes("inactive")) {
          return apiBadRequest(msg.replace("INSUFFICIENT_SAVINGS: ", ""))
        }
        return apiInternalError(txErr)
      }
    }

    // 5. Trigger Notification & Security Audit Log
    await createNotification(
      user.id,
      "Savings Withdrawal Successful 💳",
      `Successfully withdrawn ₦${withdrawalAmount.toLocaleString()}.00 from savings. ₦${netAmountCredited.toLocaleString()}.00 credited to your primary checking wallet.${penaltyFee > 0 ? ` (Penalty fee: ₦${penaltyFee.toFixed(2)})` : ""}`,
      "SUCCESS"
    )

    await logAuditEvent(
      user.id,
      "WALLET_CREDIT",
      `Withdrew ₦${withdrawalAmount} from savings ${targetSavingsId}. Credited ₦${netAmountCredited} to primary wallet.`
    )

    return NextResponse.json({
      success: true,
      message: `Successfully withdrawn ₦${withdrawalAmount.toLocaleString()}.00 from savings vault.`,
      withdrawalAmount,
      penaltyFee,
      netAmountCredited,
      primaryWalletBalance: updatedPrimaryWallet?.balance,
      savingsAccount: updatedSavingsAccount,
      transaction: transactionRecord,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}
