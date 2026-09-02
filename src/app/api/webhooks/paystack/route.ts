/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { getPrismaClient } from "@/lib/prisma"
import { verifyPaystackSignature } from "@/lib/payments"
import { createNotification } from "@/lib/notifications"

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-paystack-signature")

    // 1. Mandatory HMAC SHA512 Signature Authentication Check
    const secretKey = process.env.PAYSTACK_SECRET_KEY
    if (secretKey) {
      const isValidSignature = verifyPaystackSignature(rawBody, signature)
      if (!isValidSignature) {
        return NextResponse.json(
          { message: "Invalid or unauthenticated Paystack webhook signature" },
          { status: 401 }
        )
      }
    }

    // 2. Parse Request Payload
    let payload: any = null
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ message: "Malformed JSON payload" }, { status: 400 })
    }

    if (!payload || !payload.event || !payload.data) {
      return NextResponse.json({ message: "Invalid webhook payload structure" }, { status: 400 })
    }

    const { event, data } = payload
    const reference = String(data.reference || data.tx_ref || `PAY_${Date.now()}`).trim()
    const eventId = String(payload.event_id || data.event_id || payload.id || reference).trim()
    const providerTxId = String(data.id || data.transaction_id || reference).trim()

    const { client } = getPrismaClient()

    if (!client.transaction) {
      return NextResponse.json({ status: "success", message: "Webhook acknowledged" }, { status: 200 })
    }

    // 3. Mandatory Unique Constraint Pre-Inspection Check (reference, eventId, providerTxId)
    const existingTx = await client.transaction.findFirst({
      where: {
        OR: [
          { reference },
          ...(eventId ? [{ eventId }] : []),
          ...(providerTxId ? [{ providerTxId }] : []),
        ],
      },
    })

    if (existingTx) {
      return NextResponse.json(
        {
          status: "success",
          isReplay: true,
          message: "Webhook event/reference already processed successfully. Duplicate credit prevented.",
          transactionId: existingTx.id,
          reference: existingTx.reference,
        },
        { status: 200 }
      )
    }

    // 4. Handle Incoming DVA Transfer Event ("charge.success" or "transfer.success")
    if (event === "charge.success" || event === "transfer.success") {
      const receiverAccNumber =
        data.receiver_account_number ||
        data.authorization?.receiver_bank_account_number ||
        data.metadata?.accountNumber ||
        undefined

      let targetAcc = null

      // A. Match by DVA NUBAN or BankSpace Account Number
      if (receiverAccNumber) {
        targetAcc = await client.bankAccount.findFirst({
          where: {
            OR: [
              { dvaNuban: receiverAccNumber },
              { accountNumber: receiverAccNumber },
            ],
            status: "ACTIVE",
          },
          include: { user: true },
        })
      }

      // B. Fallback: Match by Paystack Customer Email
      if (!targetAcc && data.customer?.email) {
        const foundUser = await client.user.findFirst({
          where: { email: { equals: data.customer.email, mode: "insensitive" } },
          include: { bankAccounts: { where: { isPrimary: true } } },
        })
        if (foundUser && foundUser.bankAccounts.length > 0) {
          targetAcc = { ...foundUser.bankAccounts[0], user: foundUser }
        }
      }

      if (!targetAcc) {
        return NextResponse.json(
          { status: "ignored", message: "Target virtual account or customer not found" },
          { status: 200 }
        )
      }

      // Convert Paystack kobo to NGN
      const numericAmount = Number(data.amount) / 100
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return NextResponse.json({ message: "Invalid deposit amount in payload" }, { status: 400 })
      }

      const now = new Date()
      const senderName =
        data.authorization?.sender_name ||
        data.customer?.first_name ||
        data.customer?.email ||
        "External Commercial Bank"

      const bankName = data.authorization?.bank || "External Bank"
      const narration =
        data.authorization?.narration ||
        `External Bank Transfer Deposit via DVA NUBAN ${targetAcc.dvaNuban || targetAcc.accountNumber}`

      // 5. Atomic Ledger Settlement with Database Unique Constraints
      let createdDepositTx: any = null
      try {
        createdDepositTx = await client.$transaction(async (tx: any) => {
          const depositTx = await tx.transaction.create({
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
              fee: Number(data.fees || 0) / 100,
              currency: "NGN",
              type: "DEPOSIT",
              category: "EXTERNAL_BANK_DEPOSIT",
              status: "SUCCESSFUL",
              description: narration,
              narration,
              note: narration,
              createdAt: now,
              completedAt: now,
            },
          })

          // Increment Recipient Balance
          const incrementResult = await tx.bankAccount.updateMany({
            where: { id: targetAcc.id, status: "ACTIVE" },
            data: { balance: { increment: numericAmount } },
          })

          if (incrementResult.count === 0) {
            throw new Error("Failed to credit target bank account balance.")
          }

          const updatedAcc = await tx.bankAccount.findUnique({ where: { id: targetAcc.id } })

          // Create CREDIT Ledger Entry
          if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
            await tx.ledgerEntry.create({
              data: {
                transactionId: depositTx.id,
                bankAccountId: targetAcc.id,
                entryType: "CREDIT",
                amount: numericAmount,
                balanceAfter: updatedAcc?.balance || 0.0,
              },
            })
          }

          return depositTx
        })
      } catch (err: any) {
        // Trap Prisma Unique Constraint Violation (P2002) - Concurrent Replay Prevention
        if (err?.code === "P2002" || err?.message?.includes("Unique constraint")) {
          return NextResponse.json(
            { status: "success", isReplay: true, message: "Duplicate webhook event trapped by database unique constraint." },
            { status: 200 }
          )
        }
        throw err
      }

      // 6. User Push Notification
      if (targetAcc.userId) {
        await createNotification(
          targetAcc.userId,
          "Incoming Bank Transfer Received",
          `₦${numericAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} has been deposited to your account from ${senderName} via DVA NUBAN.`,
          "SUCCESS"
        ).catch(() => null)
      }

      return NextResponse.json({
        status: "success",
        message: "External bank deposit settled successfully",
        transaction: createdDepositTx,
      })
    }

    return NextResponse.json({ status: "acknowledged", event }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error?.message || "Webhook processing internal error" },
      { status: 500 }
    )
  }
}
