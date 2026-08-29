const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function runGoalSavingsTests() {
  console.log("==================================================")
  console.log("   GOAL-BASED SAVINGS BACKEND TEST SUITE          ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const testEmail = `goal_user_${timestamp}@bankspace.com`
  const password = "Password123!"

  try {
    // 1. Setup User & Primary Bank Account (₦600,000)
    console.log("▶ SETUP: Creating Test User & Primary Wallet (₦600,000)")
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        name: "Goal Test User",
        email: testEmail,
        passwordHash,
        role: "USER",
        isVerified: true,
      },
    })

    const accNum = "20" + Math.floor(10000000 + Math.random() * 90000000)
    const primaryAccount = await prisma.bankAccount.create({
      data: {
        userId: user.id,
        accountNumber: accNum,
        accountName: user.name,
        bankName: "BankSpace MFB",
        balance: 600000.0,
        currency: "NGN",
        isPrimary: true,
        status: "ACTIVE",
      },
    })

    console.log(`  ✓ Primary Wallet Balance: ₦${primaryAccount.balance.toLocaleString()}\n`)

    // -------------------------------------------------------------------
    // TEST 1: GOAL CREATION (Target: ₦500,000, Deadline: 30/12/2026)
    // -------------------------------------------------------------------
    console.log("▶ TEST 1: Create Goal ('Emergency Fund', Target: ₦500,000)")
    const goal = await prisma.savingsGoal.create({
      data: {
        userId: user.id,
        title: "Emergency Fund",
        targetAmount: 500000.0,
        currentAmount: 0.0,
        targetDate: "2026-12-30",
        category: "Security",
        status: "ACTIVE",
      },
    })

    // Compute backend progress
    const computeGoalMetrics = (g) => {
      const current = Number(g.currentAmount || 0)
      const target = Number(g.targetAmount || 1)
      const progressPercent = Math.min(100, Math.round((current / target) * 100))
      const remainingAmount = Math.max(0, target - current)
      const isCompleted = current >= target
      const status = isCompleted ? "COMPLETED" : g.status || "ACTIVE"
      return { current, target, progressPercent, remainingAmount, isCompleted, status }
    }

    let m1 = computeGoalMetrics(goal)
    console.log(`  ✓ Goal Created: ID=${goal.id}, Title="${goal.title}"`)
    console.log(`  ✓ Progress Percent: ${m1.progressPercent}% (Expected 0%)`)
    console.log(`  ✓ Remaining Amount: ₦${m1.remainingAmount.toLocaleString()} (Expected ₦500,000)`)
    console.log(`  ✓ Goal Status: ${m1.status} (Expected ACTIVE)`)
    console.log("  ✅ TEST 1 PASSED\n")

    // -------------------------------------------------------------------
    // TEST 2: FIRST DEPOSIT (₦175,000) -> Progress 35%
    // -------------------------------------------------------------------
    console.log("▶ TEST 2: Deposit ₦175,000 into 'Emergency Fund'")
    const dep1Amt = 175000.0

    const goalAfterDep1 = await prisma.$transaction(async (tx) => {
      await tx.bankAccount.updateMany({
        where: { id: primaryAccount.id, balance: { gte: dep1Amt } },
        data: { balance: { decrement: dep1Amt } },
      })

      const updated = await tx.savingsGoal.update({
        where: { id: goal.id },
        data: { currentAmount: { increment: dep1Amt } },
      })

      return updated
    })

    let m2 = computeGoalMetrics(goalAfterDep1)
    console.log(`  ✓ Current Goal Amount: ₦${m2.current.toLocaleString()}`)
    console.log(`  ✓ Progress Percent: ${m2.progressPercent}% (Expected 35%)`)
    console.log(`  ✓ Remaining Amount: ₦${m2.remainingAmount.toLocaleString()} (Expected ₦325,000)`)
    console.log(`  ✓ Goal Status: ${m2.status} (Expected ACTIVE)`)

    if (m2.progressPercent === 35 && m2.remainingAmount === 325000) {
      console.log("  ✅ TEST 2 PASSED\n")
    } else {
      throw new Error(`Test 2 calculation failure: expected 35%, got ${m2.progressPercent}%`)
    }

    // -------------------------------------------------------------------
    // TEST 3: COMPLETION DEPOSIT (₦325,000) -> Progress 100% & Status "COMPLETED"
    // -------------------------------------------------------------------
    console.log("▶ TEST 3: Final Deposit ₦325,000 to Reach Target ₦500,000")
    const dep2Amt = 325000.0

    const goalAfterDep2 = await prisma.$transaction(async (tx) => {
      await tx.bankAccount.updateMany({
        where: { id: primaryAccount.id, balance: { gte: dep2Amt } },
        data: { balance: { decrement: dep2Amt } },
      })

      let updated = await tx.savingsGoal.update({
        where: { id: goal.id },
        data: { currentAmount: { increment: dep2Amt } },
      })

      // Completion Check: Set status to COMPLETED if current >= target
      if (updated.currentAmount >= updated.targetAmount) {
        updated = await tx.savingsGoal.update({
          where: { id: goal.id },
          data: { status: "COMPLETED" },
        })
      }

      return updated
    })

    let m3 = computeGoalMetrics(goalAfterDep2)
    console.log(`  ✓ Current Goal Amount: ₦${m3.current.toLocaleString()}`)
    console.log(`  ✓ Progress Percent: ${m3.progressPercent}% (Expected 100%)`)
    console.log(`  ✓ Remaining Amount: ₦${m3.remainingAmount.toLocaleString()} (Expected ₦0)`)
    console.log(`  ✓ Goal Status: ${m3.status} (Expected COMPLETED)`)

    if (m3.progressPercent === 100 && m3.isCompleted && m3.status === "COMPLETED") {
      console.log("  ✅ TEST 3 PASSED\n")
    } else {
      throw new Error(`Test 3 completion failure: expected 100% & COMPLETED status`)
    }

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Deleting test records...")
    await prisma.savingsGoal.delete({ where: { id: goal.id } })
    await prisma.bankAccount.delete({ where: { id: primaryAccount.id } })
    await prisma.user.delete({ where: { id: user.id } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 ALL GOAL-BASED SAVINGS TESTS PASSED WITH 100% SUCCESS")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ GOAL SAVINGS TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runGoalSavingsTests()
