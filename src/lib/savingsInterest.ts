/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPrismaClient } from "./prisma"
import { createNotification } from "./notifications"
import { logAuditEvent } from "./audit"

/**
 * Pure Deterministic Interest Calculation
 * Formula: Daily Interest = Math.round((balance * (annualRate / 365) * days) * 100) / 100
 */
export function calculateDailyInterest(
  currentBalance: number,
  annualInterestRate: number = 0.125, // Default 12.5% p.a.
  daysElapsed: number = 1
): number {
  if (currentBalance <= 0 || annualInterestRate <= 0 || daysElapsed <= 0) {
    return 0.0
  }

  const dailyRate = annualInterestRate / 365
  const rawInterest = currentBalance * dailyRate * daysElapsed
  return Math.round(rawInterest * 100) / 100
}

export async function processSavingsInterestAccrual(
  userId: string,
  targetSavingsId: string,
  daysElapsed: number = 1,
  customPrisma?: any
) {
  const { client } = getPrismaClient()
  const prisma = customPrisma || client

  const referenceKey = `SAV_INT_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`

  let updatedAccount: any = null
  let interestPayout = 0.0
  let txRecord: any = null

  if (prisma.bankAccount && typeof prisma.$transaction === "function") {
    const result = await prisma.$transaction(async (tx: any) => {
      // Find Primary Liquid Wallet
      const primaryAcc = await tx.bankAccount.findFirst({
        where: { userId, isPrimary: true },
      })

      if (!primaryAcc) {
        throw new Error("No active primary bank account found for user.")
      }

      // Fetch Target Savings Account or Goal Vault
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
        throw new Error("Target savings account or goal vault not found.")
      }

      if (savingsAcc.userId !== userId) {
        throw new Error("Unauthorized access to target savings vault.")
      }

      const balance = isNewSavingsAccountModel
        ? savingsAcc.currentBalance || 0
        : savingsAcc.currentAmount || 0

      const rate = savingsAcc.interestRate || 0.125
      interestPayout = calculateDailyInterest(balance, rate, daysElapsed)

      if (interestPayout <= 0) {
        return { savingsAcc, interestPayout: 0.0, txRecord: null }
      }

      // Update Savings Account Balances (Interest Accrued & Current Balance)
      if (isNewSavingsAccountModel) {
        savingsAcc = await tx.savingsAccount.update({
          where: { id: targetSavingsId },
          data: {
            interestAccrued: { increment: interestPayout },
            currentBalance: { increment: interestPayout },
          },
        })
      } else {
        savingsAcc = await tx.savingsGoal.update({
          where: { id: targetSavingsId },
          data: {
            currentAmount: { increment: interestPayout },
          },
        })
      }

      // Create Unified Transaction Record (SAVINGS_INTEREST_PAYOUT)
      txRecord = await tx.transaction.create({
        data: {
          reference: referenceKey,
          senderAccountId: primaryAcc.id,
          senderName: "BankSpace Compound Engine",
          recipientName: savingsAcc.title || savingsAcc.accountNumber || "Savings Vault",
          bankName: "BankSpace Reserve Bank",
          accountNumber: savingsAcc.accountNumber || primaryAcc.accountNumber,
          amount: interestPayout,
          fee: 0.0,
          currency: "NGN",
          type: "SAVINGS_INTEREST_PAYOUT",
          category: "Savings",
          status: "SUCCESSFUL",
          description: `Daily compound interest payout (₦${interestPayout.toFixed(2)}) for ${savingsAcc.title || "Savings Account"}`,
        },
      })

      // Create Double-Entry Ledger Entry (CREDIT)
      if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
        await tx.ledgerEntry.create({
          data: {
            transactionId: txRecord.id,
            bankAccountId: primaryAcc.id,
            entryType: "CREDIT",
            amount: interestPayout,
            balanceAfter: primaryAcc.balance,
          },
        })
      }

      return { savingsAcc, interestPayout, txRecord }
    })

    updatedAccount = result.savingsAcc
    interestPayout = result.interestPayout
    txRecord = result.txRecord
  }

  if (interestPayout > 0) {
    await createNotification(
      userId,
      "Daily Interest Credited 💰",
      `Your savings vault earned ₦${interestPayout.toFixed(2)} in interest today!`,
      "SUCCESS"
    )

    await logAuditEvent(
      userId,
      "TRANSACTION_SUCCESS",
      `Credited ₦${interestPayout.toFixed(2)} interest payout to savings vault ${targetSavingsId}`
    )
  }

  return {
    success: true,
    interestPayout,
    savingsAccount: updatedAccount,
    transaction: txRecord,
  }
}
