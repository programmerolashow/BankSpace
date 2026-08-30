/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import {
  apiUnauthorized,
  apiBadRequest,
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
    const { recipientAccount, recipientName, bankName, amount, note, customReference, category } = body

    // Infer category if not explicitly provided
    let txCategory = category ? String(category).trim().toUpperCase() : "GENERAL"
    if (!category && note) {
      const noteUpper = String(note).toUpperCase()
      if (noteUpper.includes("FOOD") || noteUpper.includes("RESTAURANT") || noteUpper.includes("LUNCH") || noteUpper.includes("DINNER") || noteUpper.includes("EAT")) {
        txCategory = "FOOD"
      } else if (noteUpper.includes("GROCERY") || noteUpper.includes("SUPERMARKET") || noteUpper.includes("SHOPRITE")) {
        txCategory = "GROCERIES"
      } else if (noteUpper.includes("POWER") || noteUpper.includes("ELECTRIC") || noteUpper.includes("WATER") || noteUpper.includes("BILL") || noteUpper.includes("NEPA")) {
        txCategory = "UTILITIES"
      } else if (noteUpper.includes("FUEL") || noteUpper.includes("UBER") || noteUpper.includes("BOLT") || noteUpper.includes("CAB") || noteUpper.includes("RIDE")) {
        txCategory = "TRANSPORT"
      } else if (noteUpper.includes("CINEMA") || noteUpper.includes("MOVIE") || noteUpper.includes("NETFLIX") || noteUpper.includes("SHOW")) {
        txCategory = "ENTERTAINMENT"
      }
    }

    const referenceKey = idempotencyKey || customReference || ("TXN_" + Date.now() + "_" + Math.floor(1000 + Math.random() * 9000))

    // 3. Idempotency Unique Reference Guard (Prevent Double Click & Refresh)
    const { client } = getPrismaClient()
    if (client.transaction && typeof client.transaction.findUnique === "function") {
      const existingTx = await client.transaction.findUnique({
        where: { reference: referenceKey },
      })
      if (existingTx) {
        return apiConflict("Duplicate transfer request detected. Transaction already processed.", {
          transaction: existingTx,
        })
      }
    }

    // 4. Validate Recipient Account
    const sanitizedAccount = String(recipientAccount || "").trim()
    if (!sanitizedAccount || sanitizedAccount.length < 10 || !/^\d+$/.test(sanitizedAccount)) {
      return apiBadRequest("Invalid recipient account number. Must be a valid 10-digit account number.")
    }

    // 5. Validate Transfer Amount
    const numericAmount = Number(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return apiBadRequest("Invalid transfer amount. Amount must be greater than ₦0.00.")
    }

    let createdTx = null

    // 6. High-Concurrency Race-Condition Proof Prisma $transaction
    if (client.bankAccount && client.transaction && typeof client.$transaction === "function") {
      try {
        createdTx = await client.$transaction(async (tx: any) => {
          const senderAcc = await tx.bankAccount.findFirst({
            where: { userId: user.id, isPrimary: true },
          })

          if (!senderAcc) {
            throw new Error("No active primary bank account found for user.")
          }

          if (senderAcc.status !== "ACTIVE") {
            throw new Error("Sender bank account is inactive or restricted.")
          }

          if (senderAcc.dailyLimit && numericAmount > senderAcc.dailyLimit) {
            throw new Error(`Transfer amount exceeds daily transaction limit of ₦${senderAcc.dailyLimit.toLocaleString()}.00.`)
          }

          // Initial check
          if (senderAcc.balance < numericAmount) {
            throw new Error(`Insufficient funds. Available balance: ₦${senderAcc.balance.toLocaleString()}.00.`)
          }

          // Create Transaction Record (Status = PROCESSING)
          const initialTx = await tx.transaction.create({
            data: {
              reference: referenceKey,
              senderAccountId: senderAcc.id,
              senderName: user.name,
              recipientName: recipientName || "Beneficiary",
              bankName: bankName || "BankSpace MFB",
              accountNumber: sanitizedAccount,
              amount: numericAmount,
              fee: 0.0,
              currency: "NGN",
              type: "TRANSFER",
              category: txCategory,
              status: "PROCESSING",
              description: `Transfer of ₦${numericAmount.toLocaleString()} to ${sanitizedAccount}`,
              note: note || null,
            },
          })

          // RACE CONDITION CONCURRENCY GUARD:
          // Atomically decrement balance with row-level balance >= amount condition guard!
          const decrementResult = await tx.bankAccount.updateMany({
            where: {
              id: senderAcc.id,
              balance: { gte: numericAmount },
              status: "ACTIVE",
            },
            data: {
              balance: { decrement: numericAmount },
            },
          })

          if (decrementResult.count === 0) {
            throw new Error("Insufficient funds or concurrent transfer conflict detected.")
          }

          // Fetch updated sender balance for ledger entry
          const updatedSender = await tx.bankAccount.findUnique({
            where: { id: senderAcc.id },
          })

          if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
            await tx.ledgerEntry.create({
              data: {
                transactionId: initialTx.id,
                bankAccountId: senderAcc.id,
                entryType: "DEBIT",
                amount: numericAmount,
                balanceAfter: updatedSender?.balance || 0.0,
              },
            })
          }

          // Check & Credit Internal Recipient
          const recipientAccRecord = await tx.bankAccount.findUnique({
            where: { accountNumber: sanitizedAccount },
          })

          if (recipientAccRecord) {
            await tx.bankAccount.update({
              where: { id: recipientAccRecord.id },
              data: { balance: { increment: numericAmount } },
            })

            const updatedRecipient = await tx.bankAccount.findUnique({
              where: { id: recipientAccRecord.id },
            })

            if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
              await tx.ledgerEntry.create({
                data: {
                  transactionId: initialTx.id,
                  bankAccountId: recipientAccRecord.id,
                  entryType: "CREDIT",
                  amount: numericAmount,
                  balanceAfter: updatedRecipient?.balance || 0.0,
                },
              })
            }
          }

          return await tx.transaction.update({
            where: { id: initialTx.id },
            data: {
              status: "SUCCESSFUL",
              recipientAccountId: recipientAccRecord?.id || null,
            },
          })
        })
      } catch (txErr) {
        const message = txErr instanceof Error ? txErr.message : "Transaction processing failed"
        if (
          message.includes("Insufficient funds") ||
          message.includes("daily transaction limit") ||
          message.includes("inactive") ||
          message.includes("conflict")
        ) {
          return apiBadRequest(message)
        }
        return apiInternalError(txErr)
      }
    }

    // Trigger Notification
    await createNotification(
      user.id,
      "Transfer Successful ↗️",
      `You successfully transferred ₦${numericAmount.toLocaleString()}.00 to Account ${sanitizedAccount}.`,
      "SUCCESS"
    )

    return NextResponse.json({
      success: true,
      transaction: createdTx || {
        reference: referenceKey,
        amount: numericAmount,
        recipientAccount: sanitizedAccount,
        bankName,
        status: "SUCCESSFUL",
        createdAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    return apiInternalError(err)
  }
}
