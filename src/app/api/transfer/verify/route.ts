import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { defaultBankingProvider } from "@/lib/bankingProvider"
import { createNotification } from "@/lib/notifications"
import { apiUnauthorized, apiBadRequest, apiInternalError } from "@/lib/errors"

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return apiUnauthorized()
    }

    const { valid, user } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return apiUnauthorized("Invalid or expired session")
    }

    const { searchParams } = new URL(request.url)
    const reference = searchParams.get("reference")

    if (!reference) {
      return apiBadRequest("Reference query parameter is required.")
    }

    const { client } = getPrismaClient()
    const existingTx = await client.transaction.findUnique({
      where: { reference },
    })

    if (!existingTx) {
      return apiBadRequest(`Transaction reference ${reference} not found.`)
    }

    // If transaction is already in final state (SUCCESSFUL or REVERSED), return current status
    if (existingTx.status === "SUCCESSFUL" || existingTx.status === "REVERSED") {
      return NextResponse.json({
        success: true,
        reference,
        status: existingTx.status,
        transaction: existingTx,
      })
    }

    // Verify status with Banking Provider
    const verification = await defaultBankingProvider.verifyExternalTransfer(reference)

    if (verification.status === "SUCCESSFUL" && existingTx.status !== "SUCCESSFUL") {
      await client.transaction.update({
        where: { id: existingTx.id },
        data: { status: "SUCCESSFUL", providerRef: verification.providerRef || existingTx.providerRef },
      })
    } else if ((verification.status === "FAILED" || verification.status === "REVERSED") && existingTx.status !== "REVERSED") {
      // Execute Atomic Refund inside Prisma $transaction
      const numericRefundAmount = existingTx.amount + (existingTx.fee || 0.0)

      await client.$transaction(async (tx: any) => {
        const senderAcc = existingTx.senderAccountId
          ? await tx.bankAccount.findUnique({ where: { id: existingTx.senderAccountId } })
          : null

        if (senderAcc) {
          await tx.transaction.update({
            where: { id: existingTx.id },
            data: { status: "REVERSED" },
          })

          const refundedAcc = await tx.bankAccount.update({
            where: { id: senderAcc.id },
            data: { balance: { increment: numericRefundAmount } },
          })

          if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
            await tx.ledgerEntry.create({
              data: {
                transactionId: existingTx.id,
                bankAccountId: senderAcc.id,
                entryType: "CREDIT",
                amount: numericRefundAmount,
                balanceAfter: refundedAcc.balance,
              },
            })
          }

          if (senderAcc.userId) {
            await createNotification(
              senderAcc.userId,
              "Transfer Reversed & Refunded 🔄",
              `Your transfer of ₦${existingTx.amount.toLocaleString()}.00 could not be completed. ₦${numericRefundAmount.toLocaleString()}.00 has been refunded to your wallet.`,
              "WARNING"
            ).catch(() => null)
          }
        }
      })
    }

    const updatedTx = await client.transaction.findUnique({ where: { id: existingTx.id } })

    return NextResponse.json({
      success: true,
      reference,
      status: updatedTx?.status || existingTx.status,
      transaction: updatedTx || existingTx,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}
