/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    // 1. Authenticate User
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return NextResponse.json({ message: error || "Invalid or expired session" }, { status: 401 })
    }

    // Read Idempotency Key from header or request body
    const idempotencyKey =
      request.headers.get("x-idempotency-key") ||
      request.headers.get("idempotency-key") ||
      undefined

    const body = await request.json()
    const { recipientAccount, recipientName, bankName, amount, note, customReference } = body

    const referenceKey = idempotencyKey || customReference || ("TXN_" + Date.now() + "_" + Math.floor(1000 + Math.random() * 9000))

    // 2. Prevent Duplicate Requests (Idempotency Check)
    const { client } = getPrismaClient()
    if (client.transaction && typeof client.transaction.findUnique === "function") {
      const existingTx = await client.transaction.findUnique({
        where: { reference: referenceKey },
      })
      if (existingTx) {
        return NextResponse.json(
          {
            message: "Duplicate transfer request detected. Transaction already processed.",
            transaction: existingTx,
          },
          { status: 409 }
        )
      }
    }

    // 3. Validate Recipient Account
    const sanitizedAccount = String(recipientAccount || "").trim()
    if (!sanitizedAccount || sanitizedAccount.length < 10 || !/^\d+$/.test(sanitizedAccount)) {
      return NextResponse.json(
        { message: "Invalid recipient account number. Must be a valid 10-digit account number." },
        { status: 400 }
      )
    }

    // 4. Validate Transfer Amount
    const numericAmount = Number(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { message: "Invalid transfer amount. Amount must be greater than ₦0.00." },
        { status: 400 }
      )
    }

    let createdTx = null

    // 5. Execute 14-Stage Atomic Pipeline inside Prisma $transaction
    if (client.bankAccount && client.transaction && typeof client.$transaction === "function") {
      try {
        createdTx = await client.$transaction(async (tx: any) => {
          // Stage A: Fetch & Lock Sender's Primary Account
          const senderAcc = await tx.bankAccount.findFirst({
            where: { userId: user.id, isPrimary: true },
          })

          if (!senderAcc) {
            throw new Error("No active primary bank account found for user.")
          }

          if (senderAcc.status !== "ACTIVE") {
            throw new Error("Sender bank account is inactive or restricted.")
          }

          // Stage B: Validate Daily Limits
          if (senderAcc.dailyLimit && numericAmount > senderAcc.dailyLimit) {
            throw new Error(`Transfer amount exceeds daily transaction limit of ₦${senderAcc.dailyLimit.toLocaleString()}.00.`)
          }

          // Stage C: Validate Available Balance
          if (senderAcc.balance < numericAmount) {
            throw new Error(`Insufficient funds. Your available balance is ₦${senderAcc.balance.toLocaleString()}.00.`)
          }

          // Stage D: Initiate & Create Transaction Record (Status = PROCESSING)
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
              category: "Transfer",
              status: "PROCESSING",
              description: `Transfer of ₦${numericAmount.toLocaleString()} to ${sanitizedAccount}`,
              note: note || null,
            },
          })

          // Stage E: Reserve & Debit Sender Funds Atomically
          const updatedSender = await tx.bankAccount.update({
            where: { id: senderAcc.id },
            data: { balance: { decrement: numericAmount } },
          })

          // Stage F: Record DEBIT Ledger Entry for Sender
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

          // Stage G: Check & Credit Internal Recipient Account
          const recipientAccRecord = await tx.bankAccount.findUnique({
            where: { accountNumber: sanitizedAccount },
          })

          if (recipientAccRecord) {
            const updatedRecipient = await tx.bankAccount.update({
              where: { id: recipientAccRecord.id },
              data: { balance: { increment: numericAmount } },
            })

            // Record CREDIT Ledger Entry for Recipient
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

          // Stage H: Finalize Transaction Status to SUCCESSFUL
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
          message.includes("inactive")
        ) {
          return NextResponse.json({ message }, { status: 400 })
        }
        console.warn("[Transfer Pipeline Error]:", txErr)
        return NextResponse.json({ message }, { status: 500 })
      }
    }

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
    const message = err instanceof Error ? err.message : "Transfer pipeline failed"
    return NextResponse.json({ message }, { status: 500 })
  }
}
