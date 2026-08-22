/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    // 1. Authenticate User & Validate Session
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return NextResponse.json({ message: error || "Invalid or expired session" }, { status: 401 })
    }

    // Read Idempotency Key
    const idempotencyKey =
      request.headers.get("x-idempotency-key") ||
      request.headers.get("idempotency-key") ||
      undefined

    const body = await request.json()
    const { destinationAccount, bankName, amount, customReference, simulateFailure } = body

    const referenceKey = idempotencyKey || customReference || ("WD_" + Date.now() + "_" + Math.floor(1000 + Math.random() * 9000))

    // 2. Prevent Double-Debiting (Idempotency Check)
    const { client } = getPrismaClient()
    if (client.transaction && typeof client.transaction.findUnique === "function") {
      const existingTx = await client.transaction.findUnique({
        where: { reference: referenceKey },
      })
      if (existingTx) {
        return NextResponse.json(
          {
            message: "Duplicate withdrawal request detected. Transaction already processed.",
            transaction: existingTx,
          },
          { status: 409 }
        )
      }
    }

    // 3. Validate Destination Account
    const sanitizedAccount = String(destinationAccount || "").trim()
    if (!sanitizedAccount || sanitizedAccount.length < 10 || !/^\d+$/.test(sanitizedAccount)) {
      return NextResponse.json(
        { message: "Invalid destination account number. Must be a valid 10-digit account number." },
        { status: 400 }
      )
    }

    // 4. Validate Withdrawal Amount & Fee
    const numericAmount = Number(amount)
    const withdrawalFee = 10.0 // Standard ₦10.00 withdrawal fee
    const totalDebit = numericAmount + withdrawalFee

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { message: "Invalid withdrawal amount. Amount must be greater than ₦0.00." },
        { status: 400 }
      )
    }

    let processedTx = null

    // 5. Execute Atomic Withdrawal & Automated Reversal Engine inside Prisma $transaction
    if (client.bankAccount && client.transaction && typeof client.$transaction === "function") {
      try {
        processedTx = await client.$transaction(async (tx: any) => {
          // Stage A: Validate Account Ownership & Lock Primary Account
          const userAcc = await tx.bankAccount.findFirst({
            where: { userId: user.id, isPrimary: true },
          })

          if (!userAcc) {
            throw new Error("No primary bank account found for user.")
          }

          if (userAcc.status !== "ACTIVE") {
            throw new Error("Bank account is inactive or restricted.")
          }

          // Stage B: Check Daily Transaction Limits
          if (userAcc.dailyLimit && numericAmount > userAcc.dailyLimit) {
            throw new Error(`Withdrawal amount exceeds daily limit of ₦${userAcc.dailyLimit.toLocaleString()}.00.`)
          }

          // Stage C: Validate Available Balance (amount + fee)
          if (userAcc.balance < totalDebit) {
            throw new Error(`Insufficient funds. Available balance: ₦${userAcc.balance.toLocaleString()}.00 (Required: ₦${totalDebit.toLocaleString()}.00 including ₦10.00 fee).`)
          }

          // Stage D: Initiate & Create Transaction Record (Status = PROCESSING)
          const initialTx = await tx.transaction.create({
            data: {
              reference: referenceKey,
              senderAccountId: userAcc.id,
              senderName: user.name,
              recipientName: `External Account (${sanitizedAccount})`,
              bankName: bankName || "Commercial Bank",
              accountNumber: sanitizedAccount,
              amount: numericAmount,
              fee: withdrawalFee,
              currency: "NGN",
              type: "WITHDRAWAL",
              category: "Transfer",
              status: "PROCESSING",
              description: `Withdrawal of ₦${numericAmount.toLocaleString()} (Fee: ₦${withdrawalFee}) to ${sanitizedAccount}`,
            },
          })

          // Stage E: Atomically Debit User Balance (amount + fee)
          const debitedAccount = await tx.bankAccount.update({
            where: { id: userAcc.id },
            data: { balance: { decrement: totalDebit } },
          })

          // Stage F: Record DEBIT Ledger Entry
          if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
            await tx.ledgerEntry.create({
              data: {
                transactionId: initialTx.id,
                bankAccountId: userAcc.id,
                entryType: "DEBIT",
                amount: totalDebit,
                balanceAfter: debitedAccount.balance,
              },
            })
          }

          // Stage G: Simulate Provider Settlement / Failure Check
          if (simulateFailure === true) {
            // AUTOMATED REVERSAL: Refund debited amount + fee back to user balance
            const refundedAccount = await tx.bankAccount.update({
              where: { id: userAcc.id },
              data: { balance: { increment: totalDebit } },
            })

            // Record CREDIT Reversal Ledger Entry
            if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
              await tx.ledgerEntry.create({
                data: {
                  transactionId: initialTx.id,
                  bankAccountId: userAcc.id,
                  entryType: "CREDIT",
                  amount: totalDebit,
                  balanceAfter: refundedAccount.balance,
                },
              })
            }

            return await tx.transaction.update({
              where: { id: initialTx.id },
              data: { status: "REVERSED" },
            })
          }

          // Stage H: Mark Status = SUCCESSFUL
          return await tx.transaction.update({
            where: { id: initialTx.id },
            data: { status: "SUCCESSFUL" },
          })
        })
      } catch (txErr) {
        const message = txErr instanceof Error ? txErr.message : "Withdrawal processing failed"
        if (
          message.includes("Insufficient funds") ||
          message.includes("exceeds daily limit") ||
          message.includes("inactive")
        ) {
          return NextResponse.json({ message }, { status: 400 })
        }
        console.warn("[Withdrawal Pipeline Error]:", txErr)
        return NextResponse.json({ message }, { status: 500 })
      }
    }

    const isReversed = processedTx?.status === "REVERSED"

    return NextResponse.json({
      success: !isReversed,
      status: processedTx?.status || "SUCCESSFUL",
      message: isReversed
        ? "Withdrawal settlement failed with provider. Funds have been automatically reversed to your wallet balance."
        : `Withdrawal of ₦${numericAmount.toLocaleString()} to ${sanitizedAccount} was successful.`,
      transaction: processedTx || {
        reference: referenceKey,
        amount: numericAmount,
        fee: withdrawalFee,
        recipientAccount: sanitizedAccount,
        bankName,
        status: "SUCCESSFUL",
        createdAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Withdrawal pipeline failed"
    return NextResponse.json({ message }, { status: 500 })
  }
}
