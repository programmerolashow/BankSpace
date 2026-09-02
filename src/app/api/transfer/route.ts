/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { defaultBankingProvider } from "@/lib/bankingProvider"
import { enforceBackendKycAccess } from "@/lib/kycStateEngine"
import {
  apiUnauthorized,
  apiBadRequest,
  apiInternalError,
} from "@/lib/errors"

export async function POST(request: Request) {
  try {
    // 1. Authenticate User Session & Enforce Centralized Backend KYC Access Level
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return apiUnauthorized()
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return apiUnauthorized(error || "Invalid or expired session")
    }

    const kycGuard = enforceBackendKycAccess(user, "FULL_ACCOUNT")
    if (!kycGuard.allowed && kycGuard.response) {
      return kycGuard.response
    }

    // 2. Read Idempotency Key
    const idempotencyKey =
      request.headers.get("x-idempotency-key") ||
      request.headers.get("idempotency-key") ||
      undefined

    const body = await request.json()
    const { recipientAccount, recipientName, bankName, bankCode, amount, note, customReference, category } = body

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

    // 4. Idempotency Key Replay Guard
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

    // 6. Sender Account Ownership & Status Check
    const senderAcc = await client.bankAccount.findFirst({
      where: { userId: user.id, isPrimary: true },
    })

    if (!senderAcc) {
      return apiBadRequest("No active primary bank account found for user.")
    }

    if (senderAcc.status !== "ACTIVE") {
      return apiBadRequest("Your bank account is inactive or restricted from making transfers.")
    }

    // 7. Check Internal Recipient vs External Bank
    const internalRecipientAcc = await client.bankAccount.findFirst({
      where: { accountNumber: sanitizedAccount, status: "ACTIVE" },
    })

    const isExternalTransfer = !internalRecipientAcc || (bankCode && bankCode !== "000000")

    // 8. Independently Resolve & Verify Recipient Account Name (Zero Client Trust)
    let verifiedRecipientName = "Beneficiary"

    if (isExternalTransfer) {
      const selectedBankCode = bankCode || "058"
      const resolution = await defaultBankingProvider.resolveAccount(sanitizedAccount, selectedBankCode)
      if (resolution.success && resolution.accountName) {
        verifiedRecipientName = resolution.accountName
      } else {
        verifiedRecipientName = `Account (${sanitizedAccount.slice(-4)})`
      }
    } else if (internalRecipientAcc) {
      verifiedRecipientName = internalRecipientAcc.accountName || "BankSpace Beneficiary"
    }

    // 8. Self-Transfer Guard
    if (internalRecipientAcc && (internalRecipientAcc.id === senderAcc.id || internalRecipientAcc.userId === user.id)) {
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

    if (isExternalTransfer) {
      // -------------------------------------------------------------------
      // EXTERNAL BANK TRANSFER FLOW VIA BANKING PROVIDER
      // -------------------------------------------------------------------
      const selectedBankCode = bankCode || "058"
      const recipientRes = await defaultBankingProvider.createTransferRecipient(
        sanitizedAccount,
        verifiedRecipientName,
        selectedBankCode
      )

      if (!recipientRes.success && process.env.PAYSTACK_SECRET_KEY) {
        return apiBadRequest(recipientRes.message || "Failed to create transfer recipient with bank provider.")
      }

      const providerResult = await defaultBankingProvider.initiateExternalTransfer(
        recipientRes.recipientCode || `RCP_${sanitizedAccount}`,
        roundedAmount,
        referenceKey,
        note || `Transfer to ${sanitizedAccount}`
      )

      // Execute DB Debit inside Prisma $transaction
      createdTx = await client.$transaction(async (tx: any) => {
        const initialTx = await tx.transaction.create({
          data: {
            reference: referenceKey,
            providerRef: providerResult.providerRef || null,
            senderAccountId: senderAcc.id,
            senderName: user.name,
            recipientName: verifiedRecipientName,
            bankName: bankName || "External Bank",
            accountNumber: sanitizedAccount,
            amount: roundedAmount,
            fee: providerResult.fee || 0.0,
            currency: "NGN",
            type: "TRANSFER",
            category: "EXTERNAL_TRANSFER_OUT",
            sourceType: "BANK",
            status: providerResult.status, // "PENDING" or "SUCCESSFUL" from provider
            description: `External Bank Transfer of ₦${roundedAmount.toLocaleString()} to ${sanitizedAccount}`,
            note: note || null,
          },
        })

        const decrementResult = await tx.bankAccount.updateMany({
          where: { id: senderAcc.id, balance: { gte: roundedAmount }, status: "ACTIVE" },
          data: { balance: { decrement: roundedAmount } },
        })

        if (decrementResult.count === 0) {
          throw new Error("Insufficient funds or concurrent transfer conflict detected.")
        }

        const updatedSender = await tx.bankAccount.findUnique({ where: { id: senderAcc.id } })

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

        return initialTx
      })
    } else {
      // -------------------------------------------------------------------
      // INTERNAL BANKSPACE P2P TRANSFER FLOW (DUAL RECONCILED TRANSACTIONS)
      // -------------------------------------------------------------------
      createdTx = await client.$transaction(async (tx: any) => {
        const now = new Date()
        const transferNarration = note || `Internal Transfer of ₦${roundedAmount.toLocaleString()} to ${verifiedRecipientName}`

        // 1. Sender Outbound Transaction Record (DEBIT)
        const senderTx = await tx.transaction.create({
          data: {
            reference: referenceKey,
            senderAccountId: senderAcc.id,
            recipientAccountId: internalRecipientAcc.id,
            senderName: user.name,
            recipientName: verifiedRecipientName,
            bankName: bankName || internalRecipientAcc.bankName || "BankSpace MFB",
            accountNumber: internalRecipientAcc.accountNumber,
            amount: roundedAmount,
            fee: 0.0,
            currency: "NGN",
            type: "TRANSFER",
            category: "INTERNAL_TRANSFER",
            sourceType: "BANKSPACE",
            status: "SUCCESSFUL",
            description: transferNarration,
            narration: transferNarration,
            note: note || null,
            createdAt: now,
            completedAt: now,
          },
        })

        // 2. Recipient Inbound Transaction Record (CREDIT)
        const creditNarration = note || `Transfer of ₦${roundedAmount.toLocaleString()} received from ${user.name}`
        await tx.transaction.create({
          data: {
            reference: `${referenceKey}_REC`,
            senderAccountId: senderAcc.id,
            recipientAccountId: internalRecipientAcc.id,
            senderName: user.name,
            recipientName: verifiedRecipientName,
            bankName: "BankSpace MFB",
            accountNumber: internalRecipientAcc.accountNumber,
            amount: roundedAmount,
            fee: 0.0,
            currency: "NGN",
            type: "TRANSFER",
            category: "INTERNAL_TRANSFER",
            sourceType: "BANKSPACE",
            status: "SUCCESSFUL",
            description: creditNarration,
            narration: creditNarration,
            note: note || null,
            createdAt: now,
            completedAt: now,
          },
        })

        // 3. Debit Sender Balance
        const decrementResult = await tx.bankAccount.updateMany({
          where: { id: senderAcc.id, balance: { gte: roundedAmount }, status: "ACTIVE" },
          data: { balance: { decrement: roundedAmount } },
        })

        if (decrementResult.count === 0) {
          throw new Error("Insufficient funds or concurrent transfer conflict detected.")
        }

        const updatedSender = await tx.bankAccount.findUnique({ where: { id: senderAcc.id } })

        // 4. Sender DEBIT Ledger Entry
        if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
          await tx.ledgerEntry.create({
            data: {
              transactionId: senderTx.id,
              bankAccountId: senderAcc.id,
              entryType: "DEBIT",
              amount: roundedAmount,
              balanceAfter: updatedSender?.balance || 0.0,
            },
          })
        }

        // 5. Credit Recipient Balance
        await tx.bankAccount.update({
          where: { id: internalRecipientAcc.id },
          data: { balance: { increment: roundedAmount } },
        })

        const updatedRecipient = await tx.bankAccount.findUnique({ where: { id: internalRecipientAcc.id } })

        // 6. Recipient CREDIT Ledger Entry
        if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
          await tx.ledgerEntry.create({
            data: {
              transactionId: senderTx.id,
              bankAccountId: internalRecipientAcc.id,
              entryType: "CREDIT",
              amount: roundedAmount,
              balanceAfter: updatedRecipient?.balance || 0.0,
            },
          })
        }

        return senderTx
      })

      // Notify Internal Recipient
      if (internalRecipientAcc.userId && internalRecipientAcc.userId !== user.id) {
        await createNotification(
          internalRecipientAcc.userId,
          "Account Credited ↘️",
          `You received ₦${roundedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} from ${user.name}.`,
          "SUCCESS"
        ).catch(() => null)
      }
    }

    // Trigger Notification for Sender
    await createNotification(
      user.id,
      createdTx.status === "PENDING" ? "External Transfer Pending ⏳" : "Transfer Successful ↗️",
      `Transfer of ₦${roundedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} to ${recipientName || sanitizedAccount} (${bankName || "Bank"}) is ${createdTx.status}.`,
      createdTx.status === "PENDING" ? "INFO" : "SUCCESS"
    )

    return NextResponse.json({
      success: true,
      transaction: createdTx,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}
