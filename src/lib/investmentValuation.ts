/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPrismaClient } from "@/lib/prisma"

export type HoldingValuationResult = {
  holdingId: string
  productId: string
  symbol: string
  productName: string
  category: string
  unitsOwned: number
  costBasisUnitPrice: number
  costBasis: number
  currentUnitPrice: number
  currentValue: number
  profitLoss: number
  returnPercent: number
  purchaseDate: string
  maturityDate: string | null
  status: string
}

export type PortfolioValuationSummary = {
  totalCostBasis: number
  totalCurrentValue: number
  totalProfitLoss: number
  overallReturnPercent: number
  holdingsCount: number
  holdings: HoldingValuationResult[]
}

/**
 * Calculates deterministic server-side valuation for a single holding position
 */
export function calculateHoldingValuation(
  unitsOwned: number,
  costBasis: number,
  currentUnitPrice: number
): { currentValue: number; profitLoss: number; returnPercent: number } {
  const units = Math.max(0, unitsOwned)
  const cost = Math.max(0, costBasis)
  const price = Math.max(0, currentUnitPrice)

  const currentValue = Math.round(units * price * 100) / 100
  const profitLoss = Math.round((currentValue - cost) * 100) / 100
  const returnPercent = cost > 0 ? Math.round(((currentValue - cost) / cost) * 10000) / 100 : 0.0

  return { currentValue, profitLoss, returnPercent }
}

/**
 * Computes authoritative server-side portfolio valuation for a user across all active holdings
 */
export async function calculateUserPortfolioValuation(
  userId: string
): Promise<PortfolioValuationSummary> {
  const { client } = getPrismaClient()

  if (!client.investmentHolding || typeof client.investmentHolding.findMany !== "function") {
    return {
      totalCostBasis: 0.0,
      totalCurrentValue: 0.0,
      totalProfitLoss: 0.0,
      overallReturnPercent: 0.0,
      holdingsCount: 0,
      holdings: [],
    }
  }

  const holdings = await client.investmentHolding.findMany({
    where: { userId, status: { in: ["ACTIVE", "MATURED"] } },
    include: { product: true },
  })

  let totalCostBasis = 0.0
  let totalCurrentValue = 0.0
  const evaluatedHoldings: HoldingValuationResult[] = []

  for (const h of holdings) {
    const costBasis = h.principalInvested || h.unitsOwned * h.costBasisUnitPrice
    const currentPrice = h.product?.unitPriceNav || h.currentUnitPrice
    const valuation = calculateHoldingValuation(h.unitsOwned, costBasis, currentPrice)

    totalCostBasis += costBasis
    totalCurrentValue += valuation.currentValue

    evaluatedHoldings.push({
      holdingId: h.id,
      productId: h.productId,
      symbol: h.product?.symbol || "ASSET",
      productName: h.product?.name || "Managed Investment",
      category: h.product?.category || "MUTUAL_FUND",
      unitsOwned: h.unitsOwned,
      costBasisUnitPrice: h.costBasisUnitPrice,
      costBasis,
      currentUnitPrice: currentPrice,
      currentValue: valuation.currentValue,
      profitLoss: valuation.profitLoss,
      returnPercent: valuation.returnPercent,
      purchaseDate: h.purchaseDate.toISOString(),
      maturityDate: h.maturityDate ? h.maturityDate.toISOString() : null,
      status: h.status,
    })
  }

  const totalProfitLoss = Math.round((totalCurrentValue - totalCostBasis) * 100) / 100
  const overallReturnPercent =
    totalCostBasis > 0
      ? Math.round(((totalCurrentValue - totalCostBasis) / totalCostBasis) * 10000) / 100
      : 0.0

  return {
    totalCostBasis: Math.round(totalCostBasis * 100) / 100,
    totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
    totalProfitLoss,
    overallReturnPercent,
    holdingsCount: evaluatedHoldings.length,
    holdings: evaluatedHoldings,
  }
}
