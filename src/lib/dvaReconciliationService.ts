/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPrismaClient } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

export interface ReconciliationReport {
  success: boolean
  accountNumber: string
  dvaNuban?: string
  totalReconciledCount: number
  totalReconciledAmount: number
  reconciledTransactions: any[]
  message: string
}

/**
 * Paystack Dedicated Account Requery & Unprocessed Webhook Reconciliation Engine
 * Detects external bank transfers sent to DVA NUBANs where webhooks were delayed or dropped.
 */
export async function reconcileDvaAccount(
  accountNumberOrDva: string
): Promise<ReconciliationReport> {
  const { client } = getPrismaClient()
  const sanitizedTarget = String(accountNumberOrDva || "").trim()

  if (!sanitizedTarget) {
    return {
      success: false,
      accountNumber: "",
      totalReconciledCount: 0,
      totalReconciledAmount: 0,
      reconciledTransactions: [],
      message: "Target account number or DVA NUBAN is required for reconciliation.",
    }
  }

  // 1. Fetch Target BankSpace Account
  const targetAcc = await client.bankAccount.findFirst({
    where: {
      OR: [
        { dvaNuban: sanitizedTarget },
        { accountNumber: sanitizedTarget },
      ],
      status: "ACTIVE",
    },
    include: { user: true },
  })

  if (!targetAcc) {
    return {
      success: false,
      accountNumber: sanitizedTarget,
      totalReconciledCount: 0,
      totalReconciledAmount: 0,
      reconciledTransactions: [],
      message: `No active BankSpace account found for '${sanitizedTarget}'.`,
    }
  }

  const dvaNuban = targetAcc.dvaNuban || targetAcc.accountNumber
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY

  let providerSettledTxs: any[] = []

  // 2. Query Paystack Dedicated Account Requery API if credentials exist
  if (paystackSecret && dvaNuban) {
    try {
      const url = `https://api.paystack.co/dedicated_account/requery?account_number=${encodeURIComponent(
        dvaNuban
      )}&provider_slug=wema-bank`

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
      })

      const data = await res.json().catch(() => null)
      if (data?.status && Array.isArray(data?.data)) {
        providerSettledTxs = data.data
      }
    } catch (err) {
      console.warn("[Paystack DVA Requery Notice]:", err)
    }
  }

  let totalReconciledCount = 0
  let totalReconciledAmount = 0
  const reconciledTransactions: any[] = []

  // 3. Reconcile Each Provider Settled Transaction Against PostgreSQL DB
  for (const item of providerSettledTxs) {
    const reference = String(item.reference || item.tx_ref || `REQ_${Date.now()}_${item.id}`).trim()
    const eventId = String(item.event_id || item.id || reference).trim()
    const providerTxId = String(item.id || item.transaction_id || reference).trim()

    // Check if reference/eventId/providerTxId already exists in DB
    const existing = await client.transaction.findFirst({
      where: {
        OR: [
          { reference },
          { eventId },
          { providerTxId },
        ],
      },
    })

    if (!existing) {
      const numericAmount = Number(item.amount) / 100 // Convert Paystack kobo to NGN
      if (isNaN(numericAmount) || numericAmount <= 0) continue

      const now = new Date()
      const senderName =
        item.sender_name || item.customer?.first_name || item.customer?.email || "External Commercial Bank"
      const bankName = item.bank_name || "External Bank"
      const narration =
        item.narration || `Reconciled DVA External Bank Transfer via NUBAN ${dvaNuban}`

      try {
        const depositTx = await client.$transaction(async (tx: any) => {
          const created = await tx.transaction.create({
            data: {
              reference,
              eventId,
              providerTxId,
              providerRef: providerTxId,
              recipientAccountId: targetAcc.id,
              senderName,
              recipientName: targetAcc.accountName || targetAcc.user?.name || "BankSpace Customer",
              bankName,
              accountNumber: targetAcc.accountNumber,
              amount: numericAmount,
              fee: Number(item.fees || 0) / 100,
              currency: "NGN",
              type: "DEPOSIT",
              category: "EXTERNAL_TRANSFER_IN",
              sourceType: "BANK",
              status: "SUCCESSFUL",
              description: narration,
              narration,
              note: narration,
              createdAt: now,
              completedAt: now,
            },
          })

          const incrementResult = await tx.bankAccount.updateMany({
            where: { id: targetAcc.id, status: "ACTIVE" },
            data: { balance: { increment: numericAmount } },
          })

          if (incrementResult.count === 0) {
            throw new Error("Failed to credit target bank account balance during reconciliation.")
          }

          const updatedAcc = await tx.bankAccount.findUnique({ where: { id: targetAcc.id } })

          if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
            await tx.ledgerEntry.create({
              data: {
                transactionId: created.id,
                bankAccountId: targetAcc.id,
                entryType: "CREDIT",
                amount: numericAmount,
                balanceAfter: updatedAcc?.balance || 0.0,
              },
            })
          }

          return created
        })

        if (targetAcc.userId) {
          await createNotification(
            targetAcc.userId,
            "Incoming Bank Transfer Reconciled",
            `₦${numericAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} has been reconciled and deposited to your account from ${senderName}.`,
            "SUCCESS"
          ).catch(() => null)
        }

        totalReconciledCount++
        totalReconciledAmount += numericAmount
        reconciledTransactions.push(depositTx)
      } catch (err: any) {
        if (err?.code !== "P2002") {
          console.warn("[DVA Reconciliation Error]:", err)
        }
      }
    }
  }

  return {
    success: true,
    accountNumber: targetAcc.accountNumber,
    dvaNuban,
    totalReconciledCount,
    totalReconciledAmount,
    reconciledTransactions,
    message:
      totalReconciledCount > 0
        ? `Successfully reconciled ${totalReconciledCount} missing external transfer(s) totaling ₦${totalReconciledAmount.toLocaleString(
            "en-US",
            { minimumFractionDigits: 2 }
          )}.`
        : "Account transfers are fully up-to-date. No unprocessed webhooks detected.",
  }
}

/**
 * System-Wide DVA Reconciliation Audit
 */
export async function reconcileAllDvaAccounts() {
  const { client } = getPrismaClient()

  const activeAccounts = await client.bankAccount.findMany({
    where: { status: "ACTIVE" },
  })

  const results: ReconciliationReport[] = []
  for (const acc of activeAccounts) {
    if (acc.dvaNuban || acc.accountNumber) {
      const res = await reconcileDvaAccount(acc.dvaNuban || acc.accountNumber)
      if (res.totalReconciledCount > 0) {
        results.push(res)
      }
    }
  }

  return {
    success: true,
    totalAccountsAudited: activeAccounts.length,
    accountsReconciledCount: results.length,
    reports: results,
  }
}
