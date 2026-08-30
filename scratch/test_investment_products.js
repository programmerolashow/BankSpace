const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function runProductCatalogTests() {
  console.log("==================================================")
  console.log("  INVESTMENT PRODUCT CATALOG BACKEND TEST SUITE   ")
  console.log("==================================================\n")

  const timestamp = Date.now()

  try {
    // -------------------------------------------------------------------
    // TEST 1: SEED & FETCH PRODUCT CATALOG ACROSS 4 CATEGORIES
    // -------------------------------------------------------------------
    console.log("▶ TEST 1: Provisioning 4 Investment Product Categories...")

    const testProducts = [
      {
        symbol: `TEST-TBILL-${timestamp}`,
        name: "Test FGN 90-Day Treasury Bill",
        description: "SEC backed fixed-income sovereign discount note.",
        category: "FIXED_INCOME",
        unitPriceNav: 1000.0,
        minInvestmentAmount: 10000.0,
        maxInvestmentAmount: 50000000.0,
        riskLevel: "LOW",
        returnModel: "FIXED_YIELD",
        expectedRateAnnual: 0.145,
        managementFeePercent: 0.005,
        entryFee: 0.0,
        lockPeriodDays: 90,
        durationText: "90-Day Fixed Term",
        liquidity: "MATURITY_ONLY",
        isMaturitySupported: true,
      },
      {
        symbol: `TEST-MMF-${timestamp}`,
        name: "Test BankSpace Money Market Fund",
        description: "High liquidity mutual fund.",
        category: "MUTUAL_FUND",
        unitPriceNav: 100.0,
        minInvestmentAmount: 1000.0,
        riskLevel: "LOW",
        returnModel: "VARIABLE_NAV",
        expectedRateAnnual: 0.125,
        managementFeePercent: 0.01,
        entryFee: 0.0,
        lockPeriodDays: 0,
        durationText: "Open-Ended",
        liquidity: "DAILY",
        isMaturitySupported: false,
      },
      {
        symbol: `TEST-ETF-${timestamp}`,
        name: "Test US S&P 500 Equity ETF",
        description: "Fractional US equities exposure.",
        category: "EQUITY_ETF",
        unitPriceNav: 819360.0,
        minInvestmentAmount: 5000.0,
        riskLevel: "MODERATE",
        returnModel: "APPRECIATION",
        expectedRateAnnual: 0.182,
        managementFeePercent: 0.0075,
        entryFee: 0.0,
        lockPeriodDays: 0,
        durationText: "Open-Ended",
        liquidity: "DAILY",
        isMaturitySupported: false,
      },
      {
        symbol: `TEST-REIT-${timestamp}`,
        name: "Test Prime Real Estate Note",
        description: "High-yield commercial property note.",
        category: "REAL_ESTATE_NOTE",
        unitPriceNav: 50000.0,
        minInvestmentAmount: 50000.0,
        maxInvestmentAmount: 10000000.0,
        riskLevel: "MODERATE",
        returnModel: "DIVIDEND_PAYOUT",
        expectedRateAnnual: 0.165,
        managementFeePercent: 0.015,
        entryFee: 0.0,
        lockPeriodDays: 180,
        durationText: "180-Day Property Note",
        liquidity: "MATURITY_ONLY",
        isMaturitySupported: true,
      },
    ]

    const createdIds = []
    for (const p of testProducts) {
      const created = await prisma.investmentProduct.create({ data: p })
      createdIds.push(created.id)
      console.log(`  ✓ Product Created: ${created.symbol} ("${created.name}") - Category: ${created.category}`)
      console.log(`    • NAV Unit Price: ₦${created.unitPriceNav.toLocaleString()}`)
      console.log(`    • Min Investment: ₦${created.minInvestmentAmount.toLocaleString()}`)
      console.log(`    • Fee / Risk / Return: ${created.managementFeePercent * 100}% fee | Risk: ${created.riskLevel} | Return: ${created.returnModel}`)
    }

    console.log("  ✅ TEST 1 PASSED\n")

    // -------------------------------------------------------------------
    // TEST 2: QUERY PRODUCT CATALOG API EQUIVALENT
    // -------------------------------------------------------------------
    console.log("▶ TEST 2: Querying Active Product Catalog from Database...")
    const fetchedProducts = await prisma.investmentProduct.findMany({
      where: { id: { in: createdIds } },
      orderBy: { createdAt: "asc" },
    })

    console.log(`  ✓ Total Catalog Products Fetched: ${fetchedProducts.length}`)
    if (fetchedProducts.length === 4) {
      console.log("  ✅ TEST 2 PASSED\n")
    } else {
      throw new Error("Catalog fetch mismatch: expected 4 products")
    }

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Deleting test product catalog records...")
    await prisma.investmentProduct.deleteMany({ where: { id: { in: createdIds } } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 ALL INVESTMENT PRODUCT CATALOG TESTS PASSED WITH 100% SUCCESS")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ PRODUCT CATALOG TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runProductCatalogTests()
