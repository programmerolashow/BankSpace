/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { apiUnauthorized, apiBadRequest, apiInternalError } from "@/lib/errors"

export async function GET() {
  try {
    const { client } = getPrismaClient()
    let products: any[] = []

    if (client.investmentProduct && typeof client.investmentProduct.findMany === "function") {
      try {
        products = await client.investmentProduct.findMany({
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
        })
      } catch (err) {
        console.warn("[Investment Products DB Notice]:", err)
      }
    }

    // Default Seed Catalog if DB table empty
    if (products.length === 0) {
      products = [
        {
          id: "prod_tbills_90d",
          symbol: "NG-TBILLS-90D",
          name: "Federal Government 90-Day Treasury Bill",
          description: "SEC & CBN backed sovereign discount notes offering guaranteed fixed yield.",
          category: "FIXED_INCOME",
          unitPriceNav: 1000.0,
          currency: "NGN",
          minInvestmentAmount: 10000.0,
          maxInvestmentAmount: 50000000.0,
          riskLevel: "LOW",
          returnModel: "FIXED_YIELD",
          expectedRateAnnual: 0.145, // 14.5% p.a.
          managementFeePercent: 0.005, // 0.5%
          entryFee: 0.0,
          lockPeriodDays: 90,
          durationText: "90-Day Fixed Term",
          liquidity: "MATURITY_ONLY",
          isMaturitySupported: true,
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
          maxInvestmentAmount: null,
          riskLevel: "LOW",
          returnModel: "VARIABLE_NAV",
          expectedRateAnnual: 0.125, // 12.5% p.a.
          managementFeePercent: 0.01, // 1.0%
          entryFee: 0.0,
          lockPeriodDays: 0,
          durationText: "Open-Ended",
          liquidity: "DAILY",
          isMaturitySupported: false,
          status: "ACTIVE",
        },
        {
          id: "prod_sp500_etf",
          symbol: "VOO-US-EQUITY",
          name: "Vanguard S&P 500 ETF (US Fractional)",
          description: "Fractional exposure to 500 leading US public enterprise corporations.",
          category: "EQUITY_ETF",
          unitPriceNav: 819360.0, // $512.10 @ ₦1,600/USD
          currency: "NGN",
          minInvestmentAmount: 5000.0,
          maxInvestmentAmount: null,
          riskLevel: "MODERATE",
          returnModel: "APPRECIATION",
          expectedRateAnnual: 0.182, // 18.2% historical
          managementFeePercent: 0.0075, // 0.75%
          entryFee: 0.0,
          lockPeriodDays: 0,
          durationText: "Open-Ended",
          liquidity: "DAILY",
          isMaturitySupported: false,
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
          maxInvestmentAmount: 10000000.0,
          riskLevel: "MODERATE",
          returnModel: "DIVIDEND_PAYOUT",
          expectedRateAnnual: 0.165, // 16.5% p.a.
          managementFeePercent: 0.015, // 1.5%
          entryFee: 0.0,
          lockPeriodDays: 180,
          durationText: "180-Day Property Note",
          liquidity: "MATURITY_ONLY",
          isMaturitySupported: true,
          status: "ACTIVE",
        },
      ]
    }

    return NextResponse.json({
      success: true,
      count: products.length,
      products,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return apiUnauthorized()
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user || user.role !== "ADMIN") {
      return apiUnauthorized(error || "Administrator privileges required.")
    }

    const body = await request.json()
    const {
      symbol,
      name,
      description,
      category,
      unitPriceNav,
      minInvestmentAmount,
      maxInvestmentAmount,
      riskLevel,
      returnModel,
      expectedRateAnnual,
      managementFeePercent,
      entryFee,
      lockPeriodDays,
      durationText,
      liquidity,
      isMaturitySupported,
    } = body

    if (!symbol || !name || !unitPriceNav || Number(unitPriceNav) <= 0) {
      return apiBadRequest("Symbol, name, and a valid unit NAV price are required.")
    }

    const { client } = getPrismaClient()
    let createdProduct = null

    if (client.investmentProduct && typeof client.investmentProduct.create === "function") {
      createdProduct = await client.investmentProduct.create({
        data: {
          symbol: String(symbol).trim().toUpperCase(),
          name: String(name).trim(),
          description: description ? String(description).trim() : null,
          category: category || "MUTUAL_FUND",
          unitPriceNav: Number(unitPriceNav),
          currency: "NGN",
          minInvestmentAmount: minInvestmentAmount ? Number(minInvestmentAmount) : 1000.0,
          maxInvestmentAmount: maxInvestmentAmount ? Number(maxInvestmentAmount) : null,
          riskLevel: riskLevel || "MODERATE",
          returnModel: returnModel || "VARIABLE_NAV",
          expectedRateAnnual: expectedRateAnnual ? Number(expectedRateAnnual) : 0.12,
          managementFeePercent: managementFeePercent ? Number(managementFeePercent) : 0.01,
          entryFee: entryFee ? Number(entryFee) : 0.0,
          lockPeriodDays: lockPeriodDays ? Number(lockPeriodDays) : 0,
          durationText: durationText || "Open-Ended",
          liquidity: liquidity || "DAILY",
          isMaturitySupported: Boolean(isMaturitySupported),
          status: "ACTIVE",
        },
      })
    }

    return NextResponse.json(
      {
        success: true,
        product: createdProduct,
      },
      { status: 201 }
    )
  } catch (err) {
    return apiInternalError(err)
  }
}
