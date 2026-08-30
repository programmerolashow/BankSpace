/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { calculateHoldingValuation } from "@/lib/investmentValuation"
import { createNotification } from "@/lib/notifications"
import { logAuditEvent } from "@/lib/audit"
import {
  apiUnauthorized,
  apiForbidden,
  apiBadRequest,
  apiNotFound,
  apiInternalError,
} from "@/lib/errors"

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return apiUnauthorized()
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return apiUnauthorized(error || "Invalid or expired session")
    }

    const body = await request.json()
    const { holdingId, unitsToLiquidate } = body

    if (!holdingId) {
      return apiBadRequest("Holding ID is required for liquidation.")
    }

    const { client } = getPrismaClient()
    const referenceKey = `INV_LIQ_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`

    let updatedHolding: any = null
    let updatedPrimaryWallet: any = null
    let transactionRecord: any = null
    let payoutAmount = 0.0
    let realizedProfitLoss = 0.0

    if (client.bankAccount && client.investmentHolding && typeof client.$transaction === "function") {
      try {
        const result = await client.$transaction(async (tx: any) => {
          const holding = await tx.investmentHolding.findUnique({
            where: { id: holdingId },
            include: { product: true },
          })

          if (!holding) {
            throw new Error("NOT_FOUND: Investment holding position not found.")
          }

          if (holding.userId !== user.id) {
            throw new Error("FORBIDDEN: You do not have permission to liquidate this position.")
          }

          if (holding.status !== "ACTIVE" && holding.status !== "MATURED") {
            throw new Error(`BAD_REQUEST: Only ACTIVE or MATURED holdings can be liquidated. Current status: ${holding.status}`)
          }

          const primaryAcc = await tx.bankAccount.findFirst({
            where: { userId: user.id, isPrimary: true },
          })

          if (!primaryAcc) {
            throw new Error("No active primary bank account found for user.")
          }

          // Full or Partial Liquidation Calculation
          const totalUnits = holding.unitsOwned
          const unitsToSell = unitsToLiquidate && Number(unitsToLiquidate) > 0
            ? Math.min(totalUnits, Number(unitsToLiquidate))
            : totalUnits

          const navPrice = holding.product?.unitPriceNav || holding.currentUnitPrice
          const costBasisFraction = (unitsToSell / totalUnits) * holding.principalInvested

          payoutAmount = Math.round(unitsToSell * navPrice * 100) / 100
          realizedProfitLoss = Math.round((payoutAmount - costBasisFraction) * 100) / 100

          const remainingUnits = totalUnits - unitsToSell
          const isFullLiquidation = remainingUnits <= 0.0001

          // Credit Primary Liquid Wallet
          const updatedPrimary = await tx.bankAccount.update({
            where: { id: primaryAcc.id },
            data: { balance: { increment: payoutAmount } },
          })

          // Update Holding Position Status & Balance
          const updatedH = await tx.investmentHolding.update({
            where: { id: holding.id },
            data: {
              unitsOwned: remainingUnits,
              principalInvested: Math.max(0, holding.principalInvested - costBasisFraction),
              currentValue: remainingUnits * navPrice,
              totalReturns: { increment: realizedProfitLoss },
              status: isFullLiquidation ? "LIQUIDATED" : "ACTIVE",
            },
          })

          // Create Transaction Record (INVESTMENT_LIQUIDATION)
          const txRecord = await tx.transaction.create({
            data: {
              reference: referenceKey,
              senderAccountId: primaryAcc.id,
              senderName: holding.product?.name || "Investment Asset",
              recipientName: user.name,
              bankName: "Global Capital Markets",
              accountNumber: primaryAcc.accountNumber,
              amount: payoutAmount,
              fee: 0.0,
              currency: "NGN",
              type: "INVESTMENT_LIQUIDATION",
              category: "Investments",
              status: "SUCCESSFUL",
              description: `Liquidation payout of ${unitsToSell.toFixed(4)} units in ${holding.product?.name} (Realized P/L: ${realizedProfitLoss >= 0 ? "+" : ""}₦${realizedProfitLoss})`,
            },
          })

          // Create Double-Entry Ledger Entry (CREDIT)
          if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
            await tx.ledgerEntry.create({
              data: {
                transactionId: txRecord.id,
                bankAccountId: primaryAcc.id,
                entryType: "CREDIT",
                amount: payoutAmount,
                balanceAfter: updatedPrimary.balance,
              },
            })
          }

          return { updatedH, updatedPrimary, txRecord }
        })

        updatedHolding = result.updatedH
        updatedPrimaryWallet = result.updatedPrimary
        transactionRecord = result.txRecord
      } catch (txErr) {
        const msg = txErr instanceof Error ? txErr.message : "Liquidation failed"
        if (msg.startsWith("NOT_FOUND:")) return apiNotFound(msg.replace("NOT_FOUND: ", ""))
        if (msg.startsWith("FORBIDDEN:")) return apiForbidden(msg.replace("FORBIDDEN: ", ""))
        if (msg.startsWith("BAD_REQUEST:")) return apiBadRequest(msg.replace("BAD_REQUEST: ", ""))
        return apiInternalError(txErr)
      }
    }

    await createNotification(
      user.id,
      "Investment Liquidated 💰",
      `Liquidation payout of ₦${payoutAmount.toLocaleString()}.00 (Realized Return: ${realizedProfitLoss >= 0 ? "+" : ""}₦${realizedProfitLoss.toLocaleString()}) credited to your primary checking wallet.`,
      "SUCCESS"
    )

    await logAuditEvent(
      user.id,
      "WALLET_CREDIT",
      `Liquidated holding ${holdingId} for ₦${payoutAmount}. Realized P/L: ₦${realizedProfitLoss}`
    )

    return NextResponse.json({
      success: true,
      message: `Successfully liquidated investment position.`,
      payoutAmount,
      realizedProfitLoss,
      primaryWalletBalance: updatedPrimaryWallet?.balance,
      holding: updatedHolding,
      transaction: transactionRecord,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}
