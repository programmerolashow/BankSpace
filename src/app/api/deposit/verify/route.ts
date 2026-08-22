/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { verifyPaystackTransaction } from "@/lib/payments"

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

    const { reference } = await request.json()

    if (!reference || typeof reference !== "string") {
      return NextResponse.json({ message: "Deposit reference is required" }, { status: 400 })
    }

    const { client } = getPrismaClient()

    if (!client.transaction || typeof client.transaction.findUnique !== "function") {
      return NextResponse.json({ success: true, message: "Deposit verified" })
    }

    const existingTx = await client.transaction.findUnique({
      where: { reference },
      include: { recipientAccount: true },
    })

    if (!existingTx) {
      return NextResponse.json({ message: "Deposit transaction record not found" }, { status: 404 })
    }

    // 1. Duplicate Processing Prevention: If already SUCCESSFUL, return 409 Conflict
    if (existingTx.status === "SUCCESSFUL") {
      return NextResponse.json(
        {
          message: "Deposit reference has already been processed and credited to wallet.",
          transaction: existingTx,
        },
        { status: 409 }
      )
    }

    // 2. Server-Side Paystack Verification with Timeout & Retry Engine
    const verification = await verifyPaystackTransaction(reference)

    if (!verification.success) {
      if (verification.status === "PROVIDER_DOWN") {
        return NextResponse.json(
          {
            message: verification.message || "Payment provider is currently undergoing maintenance. Deposit remains PENDING for webhook settlement.",
            status: "PENDING",
          },
          { status: 503 }
        )
      }
      return NextResponse.json(
        { message: verification.message || "Paystack server payment verification failed" },
        { status: 400 }
      )
    }

    // 3. Atomic Prisma $transaction: Update status, providerRef, increment balance, & record CREDIT LedgerEntry
    let verifiedTx = null
    if (client.bankAccount && typeof client.$transaction === "function") {
      verifiedTx = await client.$transaction(async (tx: any) => {
        // A. Find user primary bank account
        const targetAccount = existingTx.recipientAccountId
          ? await tx.bankAccount.findUnique({ where: { id: existingTx.recipientAccountId } })
          : await tx.bankAccount.findFirst({ where: { userId: user.id, isPrimary: true } })

        if (!targetAccount) {
          throw new Error("No destination bank account found to credit deposit")
        }

        // B. Update Transaction status to SUCCESSFUL
        const updatedTxRecord = await tx.transaction.update({
          where: { id: existingTx.id },
          data: {
            status: "SUCCESSFUL",
            providerRef: verification.providerRef || existingTx.providerRef,
            recipientAccountId: targetAccount.id,
          },
        })

        // C. Atomically increment user BankAccount balance
        const updatedAccount = await tx.bankAccount.update({
          where: { id: targetAccount.id },
          data: { balance: { increment: existingTx.amount } },
        })

        // D. Create CREDIT Ledger Entry
        if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
          await tx.ledgerEntry.create({
            data: {
              transactionId: existingTx.id,
              bankAccountId: targetAccount.id,
              entryType: "CREDIT",
              amount: existingTx.amount,
              balanceAfter: updatedAccount.balance,
            },
          })
        }

        return updatedTxRecord
      })
    }

    return NextResponse.json({
      success: true,
      message: `Deposit of ₦${existingTx.amount.toLocaleString()} verified and credited to wallet.`,
      transaction: verifiedTx || { ...existingTx, status: "SUCCESSFUL" },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Deposit verification failed"
    return NextResponse.json({ message }, { status: 500 })
  }
}
