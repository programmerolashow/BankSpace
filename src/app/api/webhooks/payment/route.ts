/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { getPrismaClient } from "@/lib/prisma"
import { verifyPaystackSignature } from "@/lib/payments"

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-paystack-signature")

    // 1. Mandatory HMAC Signature Authentication Check
    const secretKey = process.env.PAYSTACK_SECRET_KEY
    if (secretKey) {
      const isValidSignature = verifyPaystackSignature(rawBody, signature)
      if (!isValidSignature) {
        return NextResponse.json({ message: "Invalid or unauthenticated webhook signature" }, { status: 401 })
      }
    }

    // 2. Validate Request Payload Structure
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
    const reference = data.reference || data.tx_ref

    if (!reference) {
      return NextResponse.json({ message: "Missing transaction reference in payload" }, { status: 400 })
    }

    const { client } = getPrismaClient()

    if (!client.transaction || typeof client.transaction.findUnique !== "function") {
      return NextResponse.json({ status: "success", message: "Webhook acknowledged" }, { status: 200 })
    }

    // 3. Find Transaction Record in NeonDB
    const existingTx = await client.transaction.findUnique({
      where: { reference },
      include: { recipientAccount: true, senderAccount: true },
    })

    if (!existingTx) {
      return NextResponse.json({ status: "ignored", message: "Transaction reference not found" }, { status: 200 })
    }

    // 4. Idempotency Check: Prevent Duplicate & Out-of-Order Processing
    if (
      existingTx.status === "SUCCESSFUL" ||
      existingTx.status === "REVERSED" ||
      (event === "charge.success" && existingTx.status !== "PENDING")
    ) {
      return NextResponse.json(
        {
          status: "already_processed",
          message: `Idempotent event acknowledged. Transaction ${reference} is already in final state: ${existingTx.status}.`,
        },
        { status: 200 }
      )
    }

    // 5. Handle Charge Success Event (Wallet Deposit Settlement)
    if (event === "charge.success") {
      const numericAmount = Number(data.amount) / 100 // Convert Paystack kobo to NGN

      if (client.bankAccount && typeof client.$transaction === "function") {
        await client.$transaction(async (tx: any) => {
          const targetAccount = existingTx.recipientAccountId
            ? await tx.bankAccount.findUnique({ where: { id: existingTx.recipientAccountId } })
            : await tx.bankAccount.findFirst({ where: { userId: existingTx.senderAccountId || "", isPrimary: true } })

          if (targetAccount) {
            // Update status to SUCCESSFUL
            await tx.transaction.update({
              where: { id: existingTx.id },
              data: {
                status: "SUCCESSFUL",
                providerRef: String(data.id || reference),
              },
            })

            // Atomically increment user BankAccount balance
            const updatedAccount = await tx.bankAccount.update({
              where: { id: targetAccount.id },
              data: { balance: { increment: numericAmount } },
            })

            // Record CREDIT Ledger Entry
            if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
              await tx.ledgerEntry.create({
                data: {
                  transactionId: existingTx.id,
                  bankAccountId: targetAccount.id,
                  entryType: "CREDIT",
                  amount: numericAmount,
                  balanceAfter: updatedAccount.balance,
                },
              })
            }
          }
        })
      }
    }

    // 6. Handle Transfer/Withdrawal Reversal Event (Failed Outbound Payout)
    if (event === "transfer.failed" || event === "transfer.reversed") {
      const numericAmount = existingTx.amount + (existingTx.fee || 0.0)

      if (client.bankAccount && typeof client.$transaction === "function") {
        await client.$transaction(async (tx: any) => {
          const senderAcc = existingTx.senderAccountId
            ? await tx.bankAccount.findUnique({ where: { id: existingTx.senderAccountId } })
            : null

          if (senderAcc) {
            // Update status to REVERSED
            await tx.transaction.update({
              where: { id: existingTx.id },
              data: { status: "REVERSED" },
            })

            // Refund debited amount back to sender BankAccount balance
            const refundedAccount = await tx.bankAccount.update({
              where: { id: senderAcc.id },
              data: { balance: { increment: numericAmount } },
            })

            // Record CREDIT Reversal Ledger Entry
            if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
              await tx.ledgerEntry.create({
                data: {
                  transactionId: existingTx.id,
                  bankAccountId: senderAcc.id,
                  entryType: "CREDIT",
                  amount: numericAmount,
                  balanceAfter: refundedAccount.balance,
                },
              })
            }
          }
        })
      }
    }

    return NextResponse.json({ status: "success", message: "Webhook processed successfully" }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook processing error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
