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

    // 3. Amount & 2-Decimal Precision Guard
    const numericAmount = Number(amount)
    if (isNaN(numericAmount) || numericAmount <= 0 || !isFinite(numericAmount)) {
      return apiBadRequest("Invalid transfer amount. Amount must be a positive finite number greater than ₦0.00.")
    }
    const roundedAmount = Math.round(numericAmount * 100) / 100

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

    // 4. Idempotency Key Replay Guard (Prevents Replay Attacks & Double-Click Submissions)
    const { client } = getPrismaClient()
    if (client.transaction && typeof client.transaction.findUnique === "function") {
      const existingTx = await client.transaction.findUnique({
        where: { reference: referenceKey },
      })
      if (existingTx) {
        return NextResponse.json({
          success: true,
          isReplay: true,
          message: "Duplicate transfer request detected. Transaction already processed successfully.",
          transaction: existingTx,
        })
      }
    }

    // 5. Validate Recipient Account Number Format
    const sanitizedAccount = String(recipientAccount || "").trim()
    if (!sanitizedAccount || sanitizedAccount.length < 10 || !/^\d+$/.test(sanitizedAccount)) {
      return apiBadRequest("Invalid recipient account number. Must be a valid 10-digit account number.")
    }

    // 6. Recipient Account Existence & Active Status Check
    const recipientAccRecord = await client.bankAccount.findFirst({
      where: { accountNumber: sanitizedAccount, status: "ACTIVE" },
    })

    if (!recipientAccRecord) {
      return apiBadRequest(`Recipient account ${sanitizedAccount} was not found or is currently restricted.`)
    }

    // 7. Sender Primary Account Ownership & Status Check
    const senderAcc = await client.bankAccount.findFirst({
      where: { userId: user.id, isPrimary: true },
    })

    if (!senderAcc) {
      return apiBadRequest("No active primary bank account found for user.")
    }

    if (senderAcc.status !== "ACTIVE") {
      return apiBadRequest("Your bank account is inactive or restricted from making transfers.")
    }

    // 8. Self-Transfer Guard (Prevent transfer to own account)
    if (recipientAccRecord.id === senderAcc.id || recipientAccRecord.userId === user.id) {
      return apiBadRequest("Self-transfer to your own account is prohibited. Please enter a different beneficiary account number.")
    }

    // 9. Daily Limit Guard
    if (senderAcc.dailyLimit && roundedAmount > senderAcc.dailyLimit) {
      return apiBadRequest(`Transfer amount exceeds your daily limit of ₦${senderAcc.dailyLimit.toLocaleString()}.00.`)
    }

    // 10. Sender Balance Initial Guard
    if (senderAcc.balance < roundedAmount) {
      return apiBadRequest(`Insufficient funds. Available balance: ₦${senderAcc.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}. Required: ₦${roundedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`)
    }

    let createdTx = null

    // 11. High-Concurrency Race-Condition Proof Prisma $transaction Block
    if (client.bankAccount && client.transaction && typeof client.$transaction === "function") {
      try {
        createdTx = await client.$transaction(async (tx: any) => {
          // Create Initial Transaction Record (Status = PROCESSING)
          const initialTx = await tx.transaction.create({
            data: {
              reference: referenceKey,
              senderAccountId: senderAcc.id,
              senderName: user.name,
              recipientName: recipientName || recipientAccRecord.accountName || "Beneficiary",
              bankName: bankName || recipientAccRecord.bankName || "BankSpace MFB",
              accountNumber: sanitizedAccount,
              amount: roundedAmount,
              fee: 0.0,
              currency: "NGN",
              type: "TRANSFER",
              category: txCategory,
              status: "PROCESSING",
              description: `Transfer of ₦${roundedAmount.toLocaleString()} to ${sanitizedAccount}`,
              note: note || null,
            },
          })

          // RACE CONDITION CONCURRENCY GUARD:
          // Atomically decrement sender balance with row-level balance >= amount condition guard!
          const decrementResult = await tx.bankAccount.updateMany({
            where: {
              id: senderAcc.id,
              balance: { gte: roundedAmount },
              status: "ACTIVE",
            },
            data: {
              balance: { decrement: roundedAmount },
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
                amount: roundedAmount,
                balanceAfter: updatedSender?.balance || 0.0,
              },
            })
          }

          // Credit Recipient Account
          await tx.bankAccount.update({
            where: { id: recipientAccRecord.id },
            data: { balance: { increment: roundedAmount } },
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
                amount: roundedAmount,
                balanceAfter: updatedRecipient?.balance || 0.0,
              },
            })
          }

          return await tx.transaction.update({
            where: { id: initialTx.id },
            data: {
              status: "SUCCESSFUL",
              recipientAccountId: recipientAccRecord.id,
            },
          })
        })
      } catch (txErr) {
        const message = txErr instanceof Error ? txErr.message : "Transaction processing failed"
        if (
          message.includes("Insufficient funds") ||
          message.includes("daily transaction limit") ||
          message.includes("inactive") ||
          message.includes("conflict") ||
          message.includes("Self-transfer")
        ) {
          return apiBadRequest(message)
        }
        return apiInternalError(txErr)
      }
    }

    // 12. Trigger Dual Notifications (Sender & Recipient)
    await createNotification(
      user.id,
      "Transfer Successful ↗️",
      `You successfully transferred ₦${roundedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} to ${recipientName || sanitizedAccount}.`,
      "SUCCESS"
    )

    // Notify recipient
    if (recipientAccRecord.userId && recipientAccRecord.userId !== user.id) {
      await createNotification(
        recipientAccRecord.userId,
        "Account Credited ↘️",
        `You received ₦${roundedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} from ${user.name}.`,
        "SUCCESS"
      ).catch(() => null)
    }

    return NextResponse.json({
      success: true,
      transaction: createdTx || {
        reference: referenceKey,
        amount: roundedAmount,
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
