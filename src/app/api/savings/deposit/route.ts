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
    const { goalId, savingsAccountId, amount, customReference } = body

    const targetSavingsId = savingsAccountId || goalId
    if (!targetSavingsId) {
      return apiBadRequest("Savings account ID or goal ID is required.")
    }

    const depositAmount = Number(amount)
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return apiBadRequest("Invalid deposit amount. Amount must be greater than ₦0.00.")
    }

    const referenceKey =
      idempotencyKey ||
      customReference ||
      `SAV_DEP_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`

    const { client } = getPrismaClient()

    // 3. Idempotency Check
    if (client.transaction && typeof client.transaction.findUnique === "function") {
      const existingTx = await client.transaction.findUnique({
        where: { reference: referenceKey },
      })
      if (existingTx) {
        return apiConflict("Duplicate request detected. Savings deposit already processed.", {
          transaction: existingTx,
        })
      }
    }

    let updatedSavingsAccount: any = null
    let updatedPrimaryWallet: any = null
    let transactionRecord: any = null

    // 4. Prisma Interactive $Transaction
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

          // Account Ownership & Existence Check
          let savingsAcc: any = null
          let isNewSavingsAccountModel = false

          if (tx.savingsAccount && typeof tx.savingsAccount.findUnique === "function") {
            savingsAcc = await tx.savingsAccount.findUnique({
              where: { id: targetSavingsId },
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
            throw new Error("FORBIDDEN: You do not have permission to deposit into this savings account.")
          }

          // ATOMIC CONCURRENCY DECREMENT GUARD: Prevents Overdraft / Race Conditions!
          const decResult = await tx.bankAccount.updateMany({
            where: {
              id: primaryAcc.id,
              balance: { gte: depositAmount },
              status: "ACTIVE",
            },
            data: {
              balance: { decrement: depositAmount },
            },
          })

          if (decResult.count === 0) {
            throw new Error(`INSUFFICIENT_FUNDS: Insufficient funds in primary wallet. Available balance: ₦${primaryAcc.balance.toLocaleString()}.00`)
          }

          const updatedPrimary = await tx.bankAccount.findUnique({
            where: { id: primaryAcc.id },
          })

          // Update Savings Account Balances (Principal + CurrentBalance)
          if (isNewSavingsAccountModel) {
            savingsAcc = await tx.savingsAccount.update({
              where: { id: targetSavingsId },
              data: {
                principal: { increment: depositAmount },
                currentBalance: { increment: depositAmount },
              },
            })
          } else {
            savingsAcc = await tx.savingsGoal.update({
              where: { id: targetSavingsId },
              data: {
                currentAmount: { increment: depositAmount },
              },
            })
          }

          // Create Unified Transaction Record
          const txRecord = await tx.transaction.create({
            data: {
              reference: referenceKey,
              senderAccountId: primaryAcc.id,
              senderName: user.name,
              recipientName: savingsAcc.title || savingsAcc.accountNumber || "Savings Vault",
              bankName: "BankSpace Savings Vault",
              accountNumber: savingsAcc.accountNumber || primaryAcc.accountNumber,
              amount: depositAmount,
              fee: 0.0,
              currency: "NGN",
              type: "SAVINGS_DEPOSIT",
              category: "Savings",
              status: "SUCCESSFUL",
              description: `Deposit to savings vault (${savingsAcc.title || "Savings Account"})`,
            },
          })

          // Create Double-Entry Ledger Entry
          if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
            await tx.ledgerEntry.create({
              data: {
                transactionId: txRecord.id,
                bankAccountId: primaryAcc.id,
                entryType: "DEBIT",
                amount: depositAmount,
                balanceAfter: updatedPrimary?.balance || 0.0,
              },
            })
          }

          return { savingsAcc, updatedPrimary, txRecord }
        })

        updatedSavingsAccount = result.savingsAcc
        updatedPrimaryWallet = result.updatedPrimary
        transactionRecord = result.txRecord
      } catch (txErr) {
        const msg = txErr instanceof Error ? txErr.message : "Savings deposit failed"
        if (msg.startsWith("NOT_FOUND:")) return apiNotFound(msg.replace("NOT_FOUND: ", ""))
        if (msg.startsWith("FORBIDDEN:")) return apiForbidden(msg.replace("FORBIDDEN: ", ""))
        if (msg.startsWith("INSUFFICIENT_FUNDS:") || msg.includes("inactive")) {
          return apiBadRequest(msg.replace("INSUFFICIENT_FUNDS: ", ""))
        }
        return apiInternalError(txErr)
      }
    }

    // 5. Trigger Notification & Security Audit Log
    await createNotification(
      user.id,
      "Savings Goal Updated 🐷",
      `Successfully deposited ₦${depositAmount.toLocaleString()}.00 into your savings account.`,
      "SUCCESS"
    )

    await logAuditEvent(
      user.id,
      "WALLET_DEBIT",
      `Deposited ₦${depositAmount} into savings account ${targetSavingsId}`
    )

    return NextResponse.json({
      success: true,
      message: `Successfully deposited ₦${depositAmount.toLocaleString()}.00 into savings account.`,
      savingsAccount: updatedSavingsAccount,
      primaryWalletBalance: updatedPrimaryWallet?.balance,
      transaction: transactionRecord,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}
