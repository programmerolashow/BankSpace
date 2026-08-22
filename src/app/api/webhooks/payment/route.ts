/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import crypto from "crypto"
import { getPrismaClient } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || ""
    const rawBody = await request.text()
    const signature = request.headers.get("x-paystack-signature")

    // 1. Verify Paystack HMAC SHA512 signature header
    if (paystackSecretKey && signature) {
      const hash = crypto
        .createHmac("sha512", paystackSecretKey)
        .update(rawBody)
        .digest("hex")

      if (hash !== signature) {
        return NextResponse.json({ message: "Invalid Paystack webhook signature" }, { status: 401 })
      }
    }

    const payload = JSON.parse(rawBody)

    // Handle Paystack charge.success event
    if (payload.event === "charge.success" && payload.data) {
      const { reference, amount } = payload.data
      const numericAmount = Number(amount) / 100 // Convert Paystack kobo to NGN

      const { client } = getPrismaClient()
      if (client.transaction && typeof client.transaction.findUnique === "function") {
        const existingTx = await client.transaction.findUnique({
          where: { reference },
          include: { recipientAccount: true },
        })

        if (existingTx && existingTx.status === "PENDING") {
          if (client.bankAccount && typeof client.$transaction === "function") {
            await client.$transaction(async (tx: any) => {
              const targetAccount = existingTx.recipientAccountId
                ? await tx.bankAccount.findUnique({ where: { id: existingTx.recipientAccountId } })
                : null

              if (targetAccount) {
                // Update status to SUCCESSFUL
                await tx.transaction.update({
                  where: { id: existingTx.id },
                  data: { status: "SUCCESSFUL" },
                })

                // Increment user BankAccount balance
                const updatedAccount = await tx.bankAccount.update({
                  where: { id: targetAccount.id },
                  data: { balance: { increment: numericAmount } },
                })

                // Create DEPOSIT CREDIT Ledger Entry
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
      }
    }

    return NextResponse.json({ status: "success", received: true }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook processing error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
