/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
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
    const { holdingId, unitsToRedeem, isFullRedemption, customReference } = body

    if (!holdingId) {
      return apiBadRequest("Holding ID is required for investment redemption.")
    }

    const { client } = getPrismaClient()
    const referenceKey =
      customReference ||
      `INV_RED_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`

    let updatedHolding: any = null
    let updatedPrimaryWallet: any = null
    let transactionRecord: any = null
    let grossRedemptionValue = 0.0
    let penaltyFee = 0.0
    let netPayoutAmount = 0.0
    let unitsRedeemed = 0.0

    if (client.bankAccount && client.investmentHolding && typeof client.$transaction === "function") {
      try {
        const result = await client.$transaction(async (tx: any) => {
          // Fetch Investment Holding Position
          const holding = await tx.investmentHolding.findUnique({
            where: { id: holdingId },
            include: { product: true },
          })

          if (!holding) {
            throw new Error("NOT_FOUND: Investment holding position not found.")
          }

          if (holding.userId !== user.id) {
            throw new Error("FORBIDDEN: You do not have permission to redeem this holding position.")
          }

          if (holding.status !== "ACTIVE" && holding.status !== "MATURED") {
            throw new Error(`BAD_REQUEST: Only ACTIVE or MATURED holdings can be redeemed. Current status: ${holding.status}`)
          }

          // Fetch Primary Liquid Wallet
          const primaryAcc = await tx.bankAccount.findFirst({
            where: { userId: user.id, isPrimary: true },
          })

          if (!primaryAcc) {
            throw new Error("No active primary bank account found for user.")
          }

          const now = new Date()
          const isEarlyExit = holding.maturityDate ? now < holding.maturityDate : false

          // Check Early Exit Lock Rules
          if (isEarlyExit && holding.product?.isMaturitySupported && holding.product?.lockPeriodDays > 0) {
            const allowEarly = holding.product?.managementFeePercent !== undefined
            if (!allowEarly) {
              throw new Error(`BAD_REQUEST: Asset is locked until maturity date ${holding.maturityDate.toLocaleDateString()}. Early redemption is restricted for this product.`)
            }
          }

          // Calculate Units & Redemption Valuation
          const totalUnits = holding.unitsOwned
          unitsRedeemed = isFullRedemption || !unitsToRedeem
            ? totalUnits
            : Math.min(totalUnits, Math.max(0.0001, Number(unitsToRedeem)))

          if (unitsRedeemed <= 0) {
            throw new Error("BAD_REQUEST: Invalid redemption unit quantity specified.")
          }

          const navPrice = holding.product?.unitPriceNav || holding.currentUnitPrice
          grossRedemptionValue = Math.round(unitsRedeemed * navPrice * 100) / 100

          // Calculate Applicable Penalty Fees
          const penaltyRate = isEarlyExit ? (holding.product?.managementFeePercent || 0.05) : 0.0
          penaltyFee = Math.round(grossRedemptionValue * penaltyRate * 100) / 100
          netPayoutAmount = Math.round((grossRedemptionValue - penaltyFee) * 100) / 100

          const costBasisFraction = (unitsRedeemed / totalUnits) * holding.principalInvested
          const remainingUnits = Math.max(0, totalUnits - unitsRedeemed)
          const isFull = remainingUnits <= 0.0001

          // Credit Primary Liquid Wallet with Net Payout
          const updatedPrimary = await tx.bankAccount.update({
            where: { id: primaryAcc.id },
            data: { balance: { increment: netPayoutAmount } },
          })

          // Update Holding Position Status & Balance
          const updatedH = await tx.investmentHolding.update({
            where: { id: holding.id },
            data: {
              unitsOwned: remainingUnits,
              principalInvested: Math.max(0, holding.principalInvested - costBasisFraction),
              currentValue: remainingUnits * navPrice,
              totalReturns: { increment: grossRedemptionValue - costBasisFraction },
              accumulatedFees: { increment: penaltyFee },
              status: isFull ? "LIQUIDATED" : "ACTIVE",
            },
          })

          // Create Transaction Record (INVESTMENT_REDEMPTION)
          const txRecord = await tx.transaction.create({
            data: {
              reference: referenceKey,
              senderAccountId: primaryAcc.id,
              senderName: holding.product?.name || "Investment Asset",
              recipientName: user.name,
              bankName: "Global Capital Markets",
              accountNumber: primaryAcc.accountNumber,
              amount: netPayoutAmount,
              fee: penaltyFee,
              currency: "NGN",
              type: "INVESTMENT_REDEMPTION",
              category: "Investments",
              status: "SUCCESSFUL",
              description: `Investment redemption of ${unitsRedeemed.toFixed(4)} units in ${holding.product?.name} (Gross: ₦${grossRedemptionValue}, Fee: ₦${penaltyFee})`,
            },
          })

          // Create Double-Entry Ledger Entry (CREDIT)
          if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
            await tx.ledgerEntry.create({
              data: {
                transactionId: txRecord.id,
                bankAccountId: primaryAcc.id,
                entryType: "CREDIT",
                amount: netPayoutAmount,
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
        const msg = txErr instanceof Error ? txErr.message : "Redemption failed"
        if (msg.startsWith("NOT_FOUND:")) return apiNotFound(msg.replace("NOT_FOUND: ", ""))
        if (msg.startsWith("FORBIDDEN:")) return apiForbidden(msg.replace("FORBIDDEN: ", ""))
        if (msg.startsWith("BAD_REQUEST:")) return apiBadRequest(msg.replace("BAD_REQUEST: ", ""))
        return apiInternalError(txErr)
      }
    }

    // Trigger Notification & Security Audit Event Log
    await createNotification(
      user.id,
      "Investment Redemption Executed 💸",
      `Successfully redeemed ${unitsRedeemed.toFixed(4)} units for ₦${netPayoutAmount.toLocaleString()}.00 (Net Payout after ₦${penaltyFee} fee).`,
      "SUCCESS"
    )

    await logAuditEvent(
      user.id,
      "WALLET_CREDIT",
      `Redeemed investment holding ${holdingId} for net ₦${netPayoutAmount} (Gross: ₦${grossRedemptionValue}, Fee: ₦${penaltyFee})`
    )

    return NextResponse.json({
      success: true,
      message: "Investment redemption successfully processed.",
      grossRedemptionValue,
      penaltyFee,
      netPayoutAmount,
      unitsRedeemed,
      primaryWalletBalance: updatedPrimaryWallet?.balance,
      holding: updatedHolding,
      transaction: transactionRecord,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}
