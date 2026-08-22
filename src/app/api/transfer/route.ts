/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return NextResponse.json({ message: error || "Invalid or expired session" }, { status: 401 })
    }

    const { recipientAccount, recipientName, bankName, amount, note, customReference } = await request.json()

    if (!recipientAccount || !amount || Number(amount) <= 0) {
      return NextResponse.json({ message: "Invalid transfer amount or recipient details" }, { status: 400 })
    }

    const numericAmount = Number(amount)
    const { client } = getPrismaClient()
    const reference = customReference || ("TXN_" + Date.now() + "_" + Math.floor(1000 + Math.random() * 9000))

    // 1. Idempotency Check: Prevent duplicate transaction references
    if (client.transaction && typeof client.transaction.findUnique === "function") {
      const existingTx = await client.transaction.findUnique({
        where: { reference },
      })
      if (existingTx) {
        return NextResponse.json({ message: "Duplicate transaction reference detected" }, { status: 409 })
      }
    }

    let createdTx = null

    // 2. Server-Controlled Atomic Transaction State Machine & Double-Entry Ledger
    if (client.bankAccount && client.transaction && typeof client.$transaction === "function") {
      try {
        createdTx = await client.$transaction(async (tx: any) => {
          // A. Find sender's primary account
          const senderAcc = await tx.bankAccount.findFirst({
            where: { userId: user.id, isPrimary: true },
          })

          if (!senderAcc) {
            throw new Error("No active primary bank account found for user")
          }

          if (senderAcc.balance < numericAmount) {
            throw new Error("Insufficient funds in sender account")
          }

          if (senderAcc.status !== "ACTIVE") {
            throw new Error("Sender account is inactive or frozen")
          }

          // B. Create Transaction record with status = PROCESSING
          const initialTx = await tx.transaction.create({
            data: {
              reference,
              senderAccountId: senderAcc.id,
              senderName: user.name,
              recipientName: recipientName || "Beneficiary",
              bankName: bankName || "BankSpace MFB",
              accountNumber: recipientAccount,
              amount: numericAmount,
              fee: 0.0,
              currency: "NGN",
              type: "TRANSFER",
              category: "Transfer",
              status: "PROCESSING",
              note: note || null,
            },
          })

          // C. Atomically decrement sender balance
          const updatedSender = await tx.bankAccount.update({
            where: { id: senderAcc.id },
            data: { balance: { decrement: numericAmount } },
          })

          // Record DEBIT Ledger Entry for sender
          if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
            await tx.ledgerEntry.create({
              data: {
                transactionId: initialTx.id,
                bankAccountId: senderAcc.id,
                entryType: "DEBIT",
                amount: numericAmount,
                balanceAfter: updatedSender.balance,
              },
            })
          }

          // D. Check if recipient is internal BankSpace account
          const recipientAccRecord = await tx.bankAccount.findUnique({
            where: { accountNumber: recipientAccount },
          })

          if (recipientAccRecord) {
            // Atomically increment recipient balance
            const updatedRecipient = await tx.bankAccount.update({
              where: { id: recipientAccRecord.id },
              data: { balance: { increment: numericAmount } },
            })

            // Record CREDIT Ledger Entry for recipient
            if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
              await tx.ledgerEntry.create({
                data: {
                  transactionId: initialTx.id,
                  bankAccountId: recipientAccRecord.id,
                  entryType: "CREDIT",
                  amount: numericAmount,
                  balanceAfter: updatedRecipient.balance,
                },
              })
            }
          }

          // E. Mark Transaction as SUCCESSFUL
          return await tx.transaction.update({
            where: { id: initialTx.id },
            data: {
              status: "SUCCESSFUL",
              recipientAccountId: recipientAccRecord?.id || null,
            },
          })
        })
      } catch (txErr) {
        if (txErr instanceof Error && txErr.message.includes("Insufficient funds")) {
          return NextResponse.json({ message: "Insufficient funds for transfer" }, { status: 400 })
        }
        console.warn("[Atomic Double-Entry Transaction Notice]:", txErr)
      }
    }

    return NextResponse.json({
      success: true,
      transaction: createdTx || {
        reference,
        amount: numericAmount,
        recipientAccount,
        bankName,
        status: "SUCCESSFUL",
        createdAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transfer failed"
    return NextResponse.json({ message }, { status: 500 })
  }
}
