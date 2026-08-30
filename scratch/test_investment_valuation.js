function calculateHoldingValuation(unitsOwned, costBasis, currentUnitPrice) {
  const units = Math.max(0, unitsOwned)
  const cost = Math.max(0, costBasis)
  const price = Math.max(0, currentUnitPrice)

  const currentValue = Math.round(units * price * 100) / 100
  const profitLoss = Math.round((currentValue - cost) * 100) / 100
  const returnPercent = cost > 0 ? Math.round(((currentValue - cost) / cost) * 10000) / 100 : 0.0

  return { currentValue, profitLoss, returnPercent }
}

function runValuationTests() {
  console.log("==================================================")
  console.log("  SERVER-SIDE INVESTMENT VALUATION ENGINE TEST    ")
  console.log("==================================================\n")

  // -------------------------------------------------------------------
  // TEST 1: ASSET APPRECIATION (+20.0% ROI)
  // Cost Basis: ₦50,000 (50 units @ ₦1,000 cost price)
  // Current NAV: ₦1,200
  // -------------------------------------------------------------------
  console.log("▶ TEST 1: Asset Appreciation (50 units @ ₦1,200 NAV vs ₦1,000 Cost)")
  const units1 = 50.0
  const costBasis1 = 50000.0
  const currentNav1 = 1200.0

  const res1 = calculateHoldingValuation(units1, costBasis1, currentNav1)
  console.log(`  ✓ Cost Basis: ₦${costBasis1.toLocaleString()}`)
  console.log(`  ✓ Current NAV: ₦${currentNav1.toLocaleString()}`)
  console.log(`  ✓ Current Value: ₦${res1.currentValue.toLocaleString()} (Expected ₦60,000)`)
  console.log(`  ✓ Profit / Loss: +₦${res1.profitLoss.toLocaleString()} (Expected +₦10,000)`)
  console.log(`  ✓ Return Percentage: +${res1.returnPercent}% (Expected +20.0%)`)

  if (res1.currentValue === 60000.0 && res1.profitLoss === 10000.0 && res1.returnPercent === 20.0) {
    console.log("  ✅ TEST 1 PASSED\n")
  } else {
    throw new Error("Test 1 failure: Valuation calculation mismatch")
  }

  // -------------------------------------------------------------------
  // TEST 2: ASSET DEPRECIATION (-10.0% ROI)
  // Cost Basis: ₦50,000 (50 units @ ₦1,000 cost price)
  // Current NAV: ₦900
  // -------------------------------------------------------------------
  console.log("▶ TEST 2: Asset Depreciation (50 units @ ₦900 NAV vs ₦1,000 Cost)")
  const currentNav2 = 900.0

  const res2 = calculateHoldingValuation(units1, costBasis1, currentNav2)
  console.log(`  ✓ Cost Basis: ₦${costBasis1.toLocaleString()}`)
  console.log(`  ✓ Current NAV: ₦${currentNav2.toLocaleString()}`)
  console.log(`  ✓ Current Value: ₦${res2.currentValue.toLocaleString()} (Expected ₦45,000)`)
  console.log(`  ✓ Profit / Loss: -₦${Math.abs(res2.profitLoss).toLocaleString()} (Expected -₦5,000)`)
  console.log(`  ✓ Return Percentage: ${res2.returnPercent}% (Expected -10.0%)`)

  if (res2.currentValue === 45000.0 && res2.profitLoss === -5000.0 && res2.returnPercent === -10.0) {
    console.log("  ✅ TEST 2 PASSED\n")
  } else {
    throw new Error("Test 2 failure: Valuation calculation mismatch")
  }

  console.log("==================================================")
  console.log("   🎉 ALL VALUATION ENGINE TESTS PASSED WITH 100% SUCCESS")
  console.log("==================================================")
}

runValuationTests()
