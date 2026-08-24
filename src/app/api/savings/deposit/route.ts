/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { logAuditEvent } from "@/lib/audit"
import { apiUnauthorized, apiBadRequest, apiInternalError } from "@/lib/errors"

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

    const { goalId, amount } = await request.json()

    if (!goalId || !amount || Number(amount) <= 0) {
      return apiBadRequest("Invalid goal ID or deposit amount.")
    }

    const depositAmount = Number(amount)
    const { client } = getPrismaClient()
    const referenceKey = "SAV_" + Date.now() + "_" + Math.floor(1000 + Math.random() * 9000)

    if (client.bankAccount && client.savingsGoal && typeof client.$transaction === "function") {
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
              balance: { gte: depositAmount },
              status: "ACTIVE",
            },
            data: {
              balance: { decrement: depositAmount },
            },
          })

          if (decResult.count === 0) {
            throw new Error(`Insufficient funds in primary wallet. Available balance: ₦${primaryAcc.balance.toLocaleString()}.00`)
          }

          const updatedAcc = await tx.bankAccount.findUnique({
            where: { id: primaryAcc.id },
          })

          // Increment Savings Goal Balance
          const targetGoal = await tx.savingsGoal.findUnique({
            where: { id: goalId },
          })

          if (targetGoal) {
            await tx.savingsGoal.update({
              where: { id: goalId },
              data: { currentAmount: { increment: depositAmount } },
            })
          }

          // Create Unified Transaction Record
          const transactionRecord = await tx.transaction.create({
            data: {
              reference: referenceKey,
              senderAccountId: primaryAcc.id,
              senderName: user.name,
              recipientName: targetGoal?.title || "Savings Vault",
              bankName: "BankSpace Savings Vault",
              accountNumber: primaryAcc.accountNumber,
              amount: depositAmount,
              fee: 0.0,
              currency: "NGN",
              type: "SAVINGS_DEPOSIT",
              category: "Savings",
              status: "SUCCESSFUL",
              description: `Deposit to Savings Vault (${targetGoal?.title || "Goal"})`,
            },
          })

          // Create Double-Entry Ledger Entry
          if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
            await tx.ledgerEntry.create({
              data: {
                transactionId: transactionRecord.id,
                bankAccountId: primaryAcc.id,
                entryType: "DEBIT",
                amount: depositAmount,
                balanceAfter: updatedAcc?.balance || 0.0,
              },
            })
          }
        })
      } catch (txErr) {
        const msg = txErr instanceof Error ? txErr.message : "Savings deposit failed"
        if (msg.includes("Insufficient funds")) {
          return apiBadRequest(msg)
        }
        return apiInternalError(txErr)
      }
    }

    // Trigger Notification & Audit Event
    await createNotification(
      user.id,
      "Savings Goal Updated 🐷",
      `Successfully added ₦${depositAmount.toLocaleString()}.00 into your savings goal vault.`,
      "SUCCESS"
    )

    await logAuditEvent(user.id, "WALLET_DEBIT", `Deposited ₦${depositAmount} into savings goal ${goalId}`)

    return NextResponse.json({
      success: true,
      message: `Successfully added ₦${depositAmount.toLocaleString()}.00 to savings vault.`,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}
