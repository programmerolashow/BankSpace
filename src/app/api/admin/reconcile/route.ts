/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAdminSession } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { apiForbidden, apiInternalError } from "@/lib/errors"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value || ""

    const authCheck = await requireAdminSession(authToken)
    if (!authCheck.valid) {
      return apiForbidden(authCheck.error || "Administrator privileges required.")
    }

    const { client } = getPrismaClient()
    const discrepancies: any[] = []
    let totalAccountsAudited = 0
    let totalTransactionsAudited = 0

    if (client.bankAccount && typeof client.bankAccount.findMany === "function") {
      try {
        const accounts = await client.bankAccount.findMany({
          include: {
            ledgerEntries: true,
          },
        })

        totalAccountsAudited = accounts.length

        for (const acc of accounts) {
          if (acc.ledgerEntries && acc.ledgerEntries.length > 0) {
            let calculatedBalance = 0
            for (const entry of acc.ledgerEntries) {
              if (entry.entryType === "CREDIT") {
                calculatedBalance += entry.amount
              } else if (entry.entryType === "DEBIT") {
                calculatedBalance -= entry.amount
              }
            }

            // Check if database wallet balance matches ledger calculation
            const diff = Math.abs(acc.balance - calculatedBalance)
            if (diff > 0.01) {
              discrepancies.push({
                type: "BALANCE_MISMATCH",
                accountNumber: acc.accountNumber,
                accountName: acc.accountName,
                databaseBalance: acc.balance,
                calculatedLedgerBalance: calculatedBalance,
                discrepancyAmount: diff,
                severity: "HIGH",
              })
            }
          }
        }
      } catch (err) {
        console.warn("[Reconciliation Accounts Check Notice]:", err)
      }
    }

    if (client.transaction && typeof client.transaction.findMany === "function") {
      try {
        const transactions = await client.transaction.findMany({
          where: { status: "PROCESSING" },
        })
        totalTransactionsAudited = transactions.length

        for (const tx of transactions) {
          // Flag stuck processing transactions older than 10 minutes
          const ageMs = Date.now() - new Date(tx.createdAt).getTime()
          if (ageMs > 10 * 60 * 1000) {
            discrepancies.push({
              type: "STUCK_TRANSACTION",
              reference: tx.reference,
              amount: tx.amount,
              status: tx.status,
              createdAt: tx.createdAt,
              severity: "MEDIUM",
            })
          }
        }
      } catch (err) {
        console.warn("[Reconciliation Transactions Check Notice]:", err)
      }
    }

    const isReconciled = discrepancies.length === 0

    return NextResponse.json({
      status: isReconciled ? "RECONCILED" : "DISCREPANCIES_FOUND",
      auditedAt: new Date().toISOString(),
      metrics: {
        totalAccountsAudited,
        totalTransactionsAudited,
        discrepancyCount: discrepancies.length,
      },
      discrepancies,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}
