/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { logAuditEvent } from "@/lib/audit"
import {
  apiUnauthorized,
  apiBadRequest,
  apiConflict,
  apiInternalError,
} from "@/lib/errors"

export async function POST(request: Request) {
  try {
    // 1. Authenticate User Session
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return apiUnauthorized()
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return apiUnauthorized(error || "Invalid or expired session")
    }

    // 2. Read Idempotency Key
    const idempotencyKey =
      request.headers.get("x-idempotency-key") ||
      request.headers.get("idempotency-key") ||
      undefined

    const body = await request.json()
    const { productId, symbol, amount, customReference } = body

    let purchaseAmount = Number(amount)
    if (isNaN(purchaseAmount) || purchaseAmount <= 0 || !isFinite(purchaseAmount)) {
      return apiBadRequest("Invalid purchase amount. Amount must be a positive finite number greater than ₦0.00.")
    }
    purchaseAmount = Math.round(purchaseAmount * 100) / 100

    const referenceKey =
      idempotencyKey ||
      customReference ||
      `INV_BUY_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`

    const { client } = getPrismaClient()

    // 3. Idempotency Check (Prevent Double Purchases)
    if (client.transaction && typeof client.transaction.findUnique === "function") {
      const existingTx = await client.transaction.findUnique({
        where: { reference: referenceKey },
      })
      if (existingTx) {
        return apiConflict("Duplicate request detected. Investment purchase already processed.", {
          transaction: existingTx,
        })
      }
    }

    let updatedHolding: any = null
    let updatedPrimaryWallet: any = null
    let transactionRecord: any = null
    let unitsPurchased = 0.0
    let entryFee = 0.0

    // 4. Prisma Interactive $Transaction (ATOMIC MUTEX)
    if (client.bankAccount && typeof client.$transaction === "function") {
      try {
        const result = await client.$transaction(async (tx: any) => {
          // Fetch Primary Liquid Wallet
          const primaryAcc = await tx.bankAccount.findFirst({
            where: { userId: user.id, isPrimary: true },
          })

          if (!primaryAcc) {
            throw new Error("No active primary bank account found for user.")
          }

          if (primaryAcc.status !== "ACTIVE") {
            throw new Error("Primary bank account is inactive or restricted.")
          }

          // Fetch Investment Product Catalog Entry
          let product: any = null
          if (productId && tx.investmentProduct) {
            product = await tx.investmentProduct.findUnique({ where: { id: productId } })
          }
          if (!product && symbol && tx.investmentProduct) {
            product = await tx.investmentProduct.findUnique({ where: { symbol } })
          }

          // Default fallback product if catalog is empty
          if (!product) {
            product = {
              id: productId || `prod_${symbol || "GENERIC"}`,
              symbol: symbol || "GENERIC-ASSET",
              name: "BankSpace Managed Investment",
              unitPriceNav: 1000.0,
              minInvestmentAmount: 1000.0,
              maxInvestmentAmount: null,
              entryFee: 0.0,
              lockPeriodDays: 0,
              status: "ACTIVE",
            }
          }

          if (product.status && product.status !== "ACTIVE") {
            throw new Error(`Investment product ${product.name} is currently suspended or sold out.`)
          }

          // Validate Min & Max Investment Limits
          const minRequired = product.minInvestmentAmount || 1000.0
          if (purchaseAmount < minRequired) {
            throw new Error(`Minimum investment amount for ${product.name} is ₦${minRequired.toLocaleString()}.00`)
          }

          if (product.maxInvestmentAmount && purchaseAmount > product.maxInvestmentAmount) {
            throw new Error(`Maximum investment limit for ${product.name} is ₦${product.maxInvestmentAmount.toLocaleString()}.00`)
          }

          // Calculate Unit NAV & Fees
          entryFee = product.entryFee ? Math.round(purchaseAmount * product.entryFee * 100) / 100 : 0.0
          const netCapital = purchaseAmount - entryFee
          unitsPurchased = netCapital / (product.unitPriceNav || 1000.0)

          // ATOMIC BALANCE DECREMENT GUARD ON PRIMARY WALLET: Prevents Overdraft!
          const decResult = await tx.bankAccount.updateMany({
            where: {
              id: primaryAcc.id,
              balance: { gte: purchaseAmount },
              status: "ACTIVE",
            },
            data: {
              balance: { decrement: purchaseAmount },
            },
          })

          if (decResult.count === 0) {
            throw new Error(`Insufficient funds in primary wallet. Available balance: ₦${primaryAcc.balance.toLocaleString()}. Required: ₦${purchaseAmount.toLocaleString()}`)
          }

          const updatedPrimary = await tx.bankAccount.findUnique({
            where: { id: primaryAcc.id },
          })

          // Upsert Investment Holding Position
          let holding: any = null
          const now = new Date()
          const maturity = product.lockPeriodDays > 0 ? new Date(now.getTime() + product.lockPeriodDays * 86400000) : null

          if (tx.investmentHolding && typeof tx.investmentHolding.findFirst === "function") {
            const existingHolding = await tx.investmentHolding.findFirst({
              where: { userId: user.id, productId: product.id },
            })

            if (existingHolding) {
              const newUnits = existingHolding.unitsOwned + unitsPurchased
              const newPrincipal = existingHolding.principalInvested + purchaseAmount
              const newCurrentVal = newUnits * product.unitPriceNav

              holding = await tx.investmentHolding.update({
                where: { id: existingHolding.id },
                data: {
                  principalInvested: newPrincipal,
                  unitsOwned: newUnits,
                  currentUnitPrice: product.unitPriceNav,
                  currentValue: newCurrentVal,
                  totalReturns: newCurrentVal - newPrincipal,
                  accumulatedFees: { increment: entryFee },
                  status: "ACTIVE",
                },
              })
            } else {
              const holdingAccNum = "INV_" + Math.floor(10000000 + Math.random() * 90000000)
              holding = await tx.investmentHolding.create({
                data: {
                  userId: user.id,
                  productId: product.id,
                  primaryBankAccountId: primaryAcc.id,
                  accountNumber: holdingAccNum,
                  principalInvested: purchaseAmount,
                  unitsOwned: unitsPurchased,
                  costBasisUnitPrice: product.unitPriceNav,
                  currentUnitPrice: product.unitPriceNav,
                  currentValue: purchaseAmount - entryFee,
                  totalReturns: 0.0,
                  accumulatedFees: entryFee,
                  purchaseDate: now,
                  maturityDate: maturity,
                  status: "ACTIVE",
                },
              })
            }
          }

          // Create Unified Transaction Record (INVESTMENT_PURCHASE)
          const txRecord = await tx.transaction.create({
            data: {
              reference: referenceKey,
              senderAccountId: primaryAcc.id,
              senderName: user.name,
              recipientName: product.name || `${symbol} Asset`,
              bankName: "Global Capital Markets",
              accountNumber: primaryAcc.accountNumber,
              amount: purchaseAmount,
              fee: entryFee,
              currency: "NGN",
              type: "INVESTMENT_PURCHASE",
              category: "Investments",
              status: "SUCCESSFUL",
              description: `Investment purchase of ${unitsPurchased.toFixed(4)} units in ${product.name} (NAV: ₦${product.unitPriceNav})`,
            },
          })

          // Create Double-Entry Ledger Entry (DEBIT on primary wallet)
          if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
            await tx.ledgerEntry.create({
              data: {
                transactionId: txRecord.id,
                bankAccountId: primaryAcc.id,
                entryType: "DEBIT",
                amount: purchaseAmount,
                balanceAfter: updatedPrimary.balance,
              },
            })
          }

          return { holding, updatedPrimary, txRecord }
        })

        updatedHolding = result.holding
        updatedPrimaryWallet = result.updatedPrimary
        transactionRecord = result.txRecord
      } catch (txErr) {
        const msg = txErr instanceof Error ? txErr.message : "Investment purchase failed"
        if (msg.includes("Insufficient funds") || msg.includes("Minimum investment") || msg.includes("Maximum investment")) {
          return apiBadRequest(msg)
        }
        return apiInternalError(txErr)
      }
    }

    // 5. Trigger Notification & Security Audit Log
    await createNotification(
      user.id,
      "Investment Order Filled 📈",
      `Successfully purchased ${unitsPurchased.toFixed(4)} units of ${transactionRecord?.recipientName || "investment asset"}.`,
      "SUCCESS"
    )

    await logAuditEvent(
      user.id,
      "WALLET_DEBIT",
      `Purchased ₦${purchaseAmount} of investment asset ${productId || symbol}`
    )

    return NextResponse.json(
      {
        success: true,
        message: `Successfully acquired investment position.`,
        purchaseAmount,
        unitsPurchased,
        entryFee,
        primaryWalletBalance: updatedPrimaryWallet?.balance,
        holding: updatedHolding,
        transaction: transactionRecord,
      },
      { status: 201 }
    )
  } catch (err) {
    return apiInternalError(err)
  }
}
