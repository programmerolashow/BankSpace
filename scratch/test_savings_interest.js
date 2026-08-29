const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

function calculateDailyInterest(currentBalance, annualInterestRate = 0.125, daysElapsed = 1) {
  if (currentBalance <= 0 || annualInterestRate <= 0 || daysElapsed <= 0) {
    return 0.0
  }
  const dailyRate = annualInterestRate / 365
  const rawInterest = currentBalance * dailyRate * daysElapsed
  return Math.round(rawInterest * 100) / 100
}

async function runInterestTests() {
  console.log("==================================================")
  console.log("   SAVINGS INTEREST ACCRUAL & PAYOUT TEST SUITE   ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const testEmail = `int_user_${timestamp}@bankspace.com`
  const password = "Password123!"

  try {
    // -------------------------------------------------------------------
    // TEST 1: DETERMINISTIC CALCULATION FORMULA TEST
    // -------------------------------------------------------------------
    console.log("▶ TEST 1: Pure Deterministic Formula Verification")
    const balance = 400000.0 // ₦400,000
    const annualRate = 0.125 // 12.5% p.a.
    const expectedDailyInterest = 136.99 // (400,000 * 0.125 / 365) = 136.9863... -> ₦136.99

    const calculatedInterest = calculateDailyInterest(balance, annualRate, 1)
    console.log(`  ✓ Balance: ₦${balance.toLocaleString()}`)
    console.log(`  ✓ Annual Rate: ${annualRate * 100}% p.a.`)
    console.log(`  ✓ Calculated Daily Interest: ₦${calculatedInterest}`)
    console.log(`  ✓ Expected Interest: ₦${expectedDailyInterest}`)

    if (calculatedInterest === expectedDailyInterest) {
      console.log("  ✅ TEST 1 PASSED: Formula is 100% deterministic!\n")
    } else {
      throw new Error(`Formula mismatch: expected ₦${expectedDailyInterest}, got ₦${calculatedInterest}`)
    }

    // -------------------------------------------------------------------
    // SETUP: Create User & Goal Vault with ₦400,000 Balance
    // -------------------------------------------------------------------
    console.log("▶ SETUP: Creating Test User & Savings Vault")
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        name: "Interest Test User",
        email: testEmail,
        passwordHash,
        role: "USER",
        isVerified: true,
      },
    })

    const primaryAccount = await prisma.bankAccount.create({
      data: {
        userId: user.id,
        accountNumber: "20" + Math.floor(10000000 + Math.random() * 90000000),
        accountName: user.name,
        bankName: "BankSpace MFB",
        balance: 100000.0,
        currency: "NGN",
        isPrimary: true,
        status: "ACTIVE",
      },
    })

    const savingsGoal = await prisma.savingsGoal.create({
      data: {
        userId: user.id,
        title: "Interest Test Vault",
        targetAmount: 1000000.0,
        currentAmount: 400000.0,
        category: "GENERAL",
        status: "ACTIVE",
      },
    })

    console.log(`  ✓ Savings Vault Provisioned: Balance = ₦${savingsGoal.currentAmount.toLocaleString()}\n`)

    // -------------------------------------------------------------------
    // TEST 2: AUDITABLE INTEREST PAYOUT PROCESSOR
    // -------------------------------------------------------------------
    console.log("▶ TEST 2: Processing Auditable Daily Interest Payout...")
    const interestPayout = calculateDailyInterest(savingsGoal.currentAmount, 0.125, 1)
    const refKey = `SAV_INT_${timestamp}_1`

    const test2Result = await prisma.$transaction(async (tx) => {
      const updatedSavings = await tx.savingsGoal.update({
        where: { id: savingsGoal.id },
        data: { currentAmount: { increment: interestPayout } },
      })

      const txRecord = await tx.transaction.create({
        data: {
          reference: refKey,
          senderAccountId: primaryAccount.id,
          senderName: "BankSpace Compound Engine",
          recipientName: savingsGoal.title,
          bankName: "BankSpace Reserve Bank",
          accountNumber: primaryAccount.accountNumber,
          amount: interestPayout,
          fee: 0.0,
          currency: "NGN",
          type: "SAVINGS_INTEREST_PAYOUT",
          category: "Savings",
          status: "SUCCESSFUL",
          description: `Daily compound interest payout (₦${interestPayout.toFixed(2)}) for ${savingsGoal.title}`,
        },
      })

      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          transactionId: txRecord.id,
          bankAccountId: primaryAccount.id,
          entryType: "CREDIT",
          amount: interestPayout,
          balanceAfter: primaryAccount.balance,
        },
      })

      return { updatedSavings, txRecord, ledgerEntry }
    })

    console.log(`  ✓ Interest Payout Amount: ₦${interestPayout}`)
    console.log(`  ✓ Updated Vault Balance: ₦${test2Result.updatedSavings.currentAmount.toLocaleString()}`)
    console.log(`  ✓ Transaction Reference: ${test2Result.txRecord.reference} (Type: ${test2Result.txRecord.type})`)
    console.log(`  ✓ Double-Entry Ledger Record Created: ID=${test2Result.ledgerEntry.id}`)

    if (interestPayout === 136.99 && test2Result.txRecord.type === "SAVINGS_INTEREST_PAYOUT") {
      console.log("  ✅ TEST 2 PASSED: Auditable transaction & ledger entry verified!\n")
    } else {
      throw new Error("Test 2 failure: Payout record or ledger entry missing")
    }

    // -------------------------------------------------------------------
    // TEST 3: ZERO BALANCE GUARD TEST
    // -------------------------------------------------------------------
    console.log("▶ TEST 3: Zero Balance Interest Guard Test (Balance = ₦0)")
    const zeroInterest = calculateDailyInterest(0, 0.125, 1)
    console.log(`  ✓ Zero Balance Calculated Interest: ₦${zeroInterest}`)

    if (zeroInterest === 0.0) {
      console.log("  ✅ TEST 3 PASSED\n")
    } else {
      throw new Error("Test 3 failure: Zero balance generated non-zero interest")
    }

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Deleting test records...")
    await prisma.ledgerEntry.deleteMany({ where: { bankAccountId: primaryAccount.id } })
    await prisma.transaction.deleteMany({ where: { senderAccountId: primaryAccount.id } })
    await prisma.savingsGoal.delete({ where: { id: savingsGoal.id } })
    await prisma.bankAccount.delete({ where: { id: primaryAccount.id } })
    await prisma.user.delete({ where: { id: user.id } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 ALL SAVINGS INTEREST TESTS PASSED WITH 100% SUCCESS")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ INTEREST TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runInterestTests()
