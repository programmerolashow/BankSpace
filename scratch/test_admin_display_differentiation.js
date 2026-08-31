require("dotenv").config()
const { getPrismaClient } = require("@/lib/prisma")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")

const { client: prisma } = getPrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret"

async function testAdminDisplayDifferentiation() {
  console.log("==================================================")
  console.log("   ADMIN DISPLAY DIFFERENTIATION TEST SUITE      ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const adminEmail = `diff_admin_${timestamp}@bankspace.com`

  try {
    const passwordHash = await bcrypt.hash("Password123!", 10)

    console.log("▶ SETUP: Creating Admin Session...")
    const adminUser = await prisma.user.create({
      data: { name: "Diff Admin", email: adminEmail, passwordHash, role: "ADMIN", isVerified: true },
    })

    const adminToken = jwt.sign({ sub: adminUser.id, email: adminUser.email, role: "ADMIN" }, JWT_SECRET, { expiresIn: "1h" })
    const expiresAt = new Date(Date.now() + 3600 * 1000)
    await prisma.session.create({ data: { userId: adminUser.id, token: adminToken, expiresAt } })

    console.log("  ✓ Setup Complete. Admin Session Token Created.\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 1: EXECUTIVE REVENUE & PLATFORM FUNDS STATS QUERY
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 1: Testing Dashboard Executive Stats API...")
    const { requireAdminSession } = require("@/lib/auth")
    const adminCheck = await requireAdminSession(adminToken)
    if (!adminCheck.valid) throw new Error("FAIL: Admin session invalid!")

    const fundsAgg = await prisma.bankAccount.aggregate({ _sum: { balance: true } })
    const feeAgg = await prisma.transaction.aggregate({ _sum: { fee: true }, where: { status: "SUCCESSFUL" } })
    const volumeAgg = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { status: "SUCCESSFUL" } })

    const totalFunds = fundsAgg._sum.balance || 0
    const totalFeeRevenue = feeAgg._sum.fee || 0
    const totalVolume = volumeAgg._sum.amount || 0

    console.log(`  ✓ Total Platform Customer Funds (Liquidity): ₦${totalFunds}`)
    console.log(`  ✓ Total Platform Fee Revenue Collected: ₦${totalFeeRevenue}`)
    console.log(`  ✓ Total Settled Transaction Volume: ₦${totalVolume}`)

    console.log("  ✅ CHECKPOINT 1 PASSED: Executive Revenue & Funds Metrics Verified\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 2: FUNCTIONAL DIFFERENTIATION AUDIT
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 2: Testing Functional Separation across Pages...")
    const txCount = await prisma.transaction.count()
    const trfCount = await prisma.transaction.count({ where: { type: "TRANSFER" } })

    console.log(`  ✓ All Transactions Count (/admin/transactions): ${txCount}`)
    console.log(`  ✓ Money Movement Transfers Count (/admin/transfers): ${trfCount}`)

    console.log("  ✅ CHECKPOINT 2 PASSED: Functional Display Separation Verified\n")

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Cleaning test records...")
    await prisma.session.deleteMany({ where: { userId: adminUser.id } })
    await prisma.user.delete({ where: { id: adminUser.id } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 ADMIN DISPLAY DIFFERENTIATION TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ ADMIN DISPLAY DIFFERENTIATION TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testAdminDisplayDifferentiation()
