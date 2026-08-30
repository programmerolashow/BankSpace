/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { calculateUserPortfolioValuation } from "@/lib/investmentValuation"
import { apiUnauthorized, apiInternalError } from "@/lib/errors"

export async function GET() {
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

    const { client } = getPrismaClient()

    // 1. Authoritative Portfolio Valuation from Server Engine
    const valuationSummary = await calculateUserPortfolioValuation(user.id)

    // 2. Compute Category Allocation Breakdown (Server-Side)
    const categoryTotals: Record<string, number> = {
      FIXED_INCOME: 0.0,
      MUTUAL_FUND: 0.0,
      EQUITY_ETF: 0.0,
      REAL_ESTATE_NOTE: 0.0,
    }

    for (const h of valuationSummary.holdings) {
      const cat = h.category || "MUTUAL_FUND"
      categoryTotals[cat] = (categoryTotals[cat] || 0.0) + h.currentValue
    }

    const totalVal = valuationSummary.totalCurrentValue || 1.0
    const allocation = Object.keys(categoryTotals).map((cat) => ({
      category: cat,
      amount: Math.round(categoryTotals[cat] * 100) / 100,
      percent: Math.round((categoryTotals[cat] / totalVal) * 10000) / 100,
    }))

    // 3. Fetch Products Catalog (Server-Side)
    let catalogProducts: any[] = []
    if (client.investmentProduct && typeof client.investmentProduct.findMany === "function") {
      try {
        catalogProducts = await client.investmentProduct.findMany({
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
        })
      } catch (err) {
        console.warn("[Investment Catalog Notice]:", err)
      }
    }

    // Default Seed Catalog if DB table empty
    if (catalogProducts.length === 0) {
      catalogProducts = [
        {
          id: "prod_tbills_90d",
          symbol: "NG-TBILLS-90D",
          name: "Federal Government 90-Day Treasury Bill",
          description: "SEC & CBN backed sovereign discount notes offering guaranteed fixed yield.",
          category: "FIXED_INCOME",
          unitPriceNav: 1000.0,
          currency: "NGN",
          minInvestmentAmount: 10000.0,
          riskLevel: "LOW",
          returnModel: "FIXED_YIELD",
          expectedRateAnnual: 0.145,
          managementFeePercent: 0.005,
          lockPeriodDays: 90,
          durationText: "90-Day Fixed Term",
          liquidity: "MATURITY_ONLY",
          status: "ACTIVE",
        },
        {
          id: "prod_mmf_growth",
          symbol: "BS-MMF-GROWTH",
          name: "BankSpace Money Market Fund",
          description: "High-liquidity mutual fund investing in short-term money market instruments.",
          category: "MUTUAL_FUND",
          unitPriceNav: 100.0,
          currency: "NGN",
          minInvestmentAmount: 1000.0,
          riskLevel: "LOW",
          returnModel: "VARIABLE_NAV",
          expectedRateAnnual: 0.125,
          managementFeePercent: 0.01,
          lockPeriodDays: 0,
          durationText: "Open-Ended",
          liquidity: "DAILY",
          status: "ACTIVE",
        },
        {
          id: "prod_sp500_etf",
          symbol: "VOO-US-EQUITY",
          name: "Vanguard S&P 500 ETF (US Fractional)",
          description: "Fractional exposure to 500 leading US public enterprise corporations.",
          category: "EQUITY_ETF",
          unitPriceNav: 819360.0,
          currency: "NGN",
          minInvestmentAmount: 5000.0,
          riskLevel: "MODERATE",
          returnModel: "APPRECIATION",
          expectedRateAnnual: 0.182,
          managementFeePercent: 0.0075,
          lockPeriodDays: 0,
          durationText: "Open-Ended",
          liquidity: "DAILY",
          status: "ACTIVE",
        },
        {
          id: "prod_reit_prime",
          symbol: "BS-REIT-NOTE",
          name: "Lagos Prime Commercial Real Estate Note",
          description: "High-yield fractional note secured by prime commercial office real estate assets.",
          category: "REAL_ESTATE_NOTE",
          unitPriceNav: 50000.0,
          currency: "NGN",
          minInvestmentAmount: 50000.0,
          riskLevel: "MODERATE",
          returnModel: "DIVIDEND_PAYOUT",
          expectedRateAnnual: 0.165,
          managementFeePercent: 0.015,
          lockPeriodDays: 180,
          durationText: "180-Day Property Note",
          liquidity: "MATURITY_ONLY",
          status: "ACTIVE",
        },
      ]
    }

    // 4. Fetch Recent Investment Transactions
    let transactions: any[] = []
    if (client.transaction && typeof client.transaction.findMany === "function") {
      try {
        const primaryAcc = await client.bankAccount.findFirst({
          where: { userId: user.id, isPrimary: true },
        })

        if (primaryAcc) {
          transactions = await client.transaction.findMany({
            where: {
              senderAccountId: primaryAcc.id,
              category: "Investments",
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          })
        }
      } catch (err) {
        console.warn("[Investment Tx Notice]:", err)
      }
    }

    return NextResponse.json({
      success: true,
      portfolioMetrics: {
        totalInvested: valuationSummary.totalCostBasis,
        currentPortfolioValue: valuationSummary.totalCurrentValue,
        totalReturns: valuationSummary.totalProfitLoss,
        overallReturnPercent: valuationSummary.overallReturnPercent,
        holdingsCount: valuationSummary.holdingsCount,
      },
      allocation,
      holdings: valuationSummary.holdings,
      catalogProducts,
      transactions,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}
