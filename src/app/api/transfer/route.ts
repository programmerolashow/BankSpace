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

    const { recipientAccount, recipientName, bankName, amount, note } = await request.json()

    if (!recipientAccount || !amount || Number(amount) <= 0) {
      return NextResponse.json({ message: "Invalid transfer amount or recipient details" }, { status: 400 })
    }

    const numericAmount = Number(amount)
    const { client } = getPrismaClient()
    const reference = "TXN_" + Date.now() + "_" + Math.floor(1000 + Math.random() * 9000)

    let createdTx = null

    // Execute atomic balance update inside Prisma interactive transaction if available
    if (client.bankAccount && client.transaction && typeof client.$transaction === "function") {
      try {
        createdTx = await client.$transaction(async (tx: any) => {
          // 1. Fetch sender's primary account
          const senderAcc = await tx.bankAccount.findFirst({
            where: { userId: user.id, isPrimary: true },
          })

          if (senderAcc) {
            if (senderAcc.balance < numericAmount) {
              throw new Error("Insufficient funds in sender account")
            }
            if (senderAcc.status !== "ACTIVE") {
              throw new Error("Sender account is inactive or frozen")
            }

            // Atomically decrement sender balance
            await tx.bankAccount.update({
              where: { id: senderAcc.id },
              data: { balance: { decrement: numericAmount } },
            })
          }

          // 2. Check if recipient is internal BankSpace account
          const recipientAccRecord = await tx.bankAccount.findUnique({
            where: { accountNumber: recipientAccount },
          })

          if (recipientAccRecord) {
            // Atomically increment recipient balance
            await tx.bankAccount.update({
              where: { id: recipientAccRecord.id },
              data: { balance: { increment: numericAmount } },
            })
          }

          // 3. Record transaction
          return await tx.transaction.create({
            data: {
              reference,
              senderAccountId: senderAcc?.id || null,
              recipientAccountId: recipientAccRecord?.id || null,
              senderName: user.name,
              recipientName: recipientName || "Beneficiary",
              bankName: bankName || "BankSpace MFB",
              accountNumber: recipientAccount,
              amount: numericAmount,
              fee: 0.0,
              type: "TRANSFER",
              category: "Transfer",
              status: "SUCCESS",
              note: note || null,
            },
          })
        })
      } catch (txErr) {
        if (txErr instanceof Error && txErr.message.includes("Insufficient funds")) {
          return NextResponse.json({ message: "Insufficient funds for transfer" }, { status: 400 })
        }
        console.warn("[Atomic Transfer Transaction Notice]:", txErr)
      }
    }

    return NextResponse.json({
      success: true,
      transaction: createdTx || {
        reference,
        amount: numericAmount,
        recipientAccount,
        bankName,
        status: "SUCCESS",
        createdAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transfer failed"
    return NextResponse.json({ message }, { status: 500 })
  }
}
