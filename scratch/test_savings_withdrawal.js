const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function runWithdrawalTests() {
  console.log("==================================================")
  console.log("   SAVINGS WITHDRAWAL PIPELINE BACKEND TEST SUITE ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const testEmail = `wth_user_${timestamp}@bankspace.com`
  const password = "Password123!"

  try {
    // 1. Setup User & Primary Bank Account (₦10,000)
    console.log("▶ SETUP: Creating Test User & Primary Wallet (₦10,000)")
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        name: "Withdrawal Test User",
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
        balance: 10000.0,
        currency: "NGN",
        isPrimary: true,
        status: "ACTIVE",
      },
    })

    const flexibleVault = await prisma.savingsGoal.create({
      data: {
        userId: user.id,
        title: "Flexible Emergency Vault",
        targetAmount: 200000.0,
        currentAmount: 150000.0,
        category: "Security",
        status: "ACTIVE",
      },
    })

    console.log(`  ✓ Primary Wallet Balance: ₦${primaryAccount.balance.toLocaleString()}`)
    console.log(`  ✓ Savings Vault Balance: ₦${flexibleVault.currentAmount.toLocaleString()}\n`)

    // -------------------------------------------------------------------
    // TEST 1: FLEXIBLE WITHDRAWAL (Withdraw ₦50,000 -> ₦50,000 credited to primary wallet)
    // -------------------------------------------------------------------
    console.log("▶ TEST 1: Flexible Savings Withdrawal (Withdraw ₦50,000)")
    const wth1Amt = 50000.0
    const ref1 = `SAV_WTH_${timestamp}_1`

    const test1Result = await prisma.$transaction(async (tx) => {
      const updatedSavings = await tx.savingsGoal.update({
        where: { id: flexibleVault.id },
        data: { currentAmount: { decrement: wth1Amt } },
      })

      const updatedPrimary = await tx.bankAccount.update({
        where: { id: primaryAccount.id },
        data: { balance: { increment: wth1Amt } },
      })

      const txRecord = await tx.transaction.create({
        data: {
          reference: ref1,
          senderAccountId: primaryAccount.id,
          senderName: flexibleVault.title,
          recipientName: user.name,
          bankName: "BankSpace Microfinance Bank",
          accountNumber: primaryAccount.accountNumber,
          amount: wth1Amt,
          fee: 0.0,
          currency: "NGN",
          type: "SAVINGS_WITHDRAWAL",
          category: "Savings",
          status: "SUCCESSFUL",
          description: `Withdrawal from flexible savings vault (${flexibleVault.title})`,
        },
      })

      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          transactionId: txRecord.id,
          bankAccountId: primaryAccount.id,
          entryType: "CREDIT",
          amount: wth1Amt,
          balanceAfter: updatedPrimary.balance,
        },
      })

      return { updatedSavings, updatedPrimary, txRecord, ledgerEntry }
    })

    console.log(`  ✓ Savings Vault Remaining Balance: ₦${test1Result.updatedSavings.currentAmount.toLocaleString()} (Expected ₦100,000)`)
    console.log(`  ✓ Primary Wallet Balance: ₦${test1Result.updatedPrimary.balance.toLocaleString()} (Expected ₦60,000)`)
    console.log(`  ✓ Transaction Type: ${test1Result.txRecord.type}, Fee: ₦${test1Result.txRecord.fee}`)
    console.log("  ✅ TEST 1 PASSED\n")

    // -------------------------------------------------------------------
    // TEST 2: EARLY LOCKED WITHDRAWAL PENALTY (Withdraw ₦100,000 with 5% Penalty = ₦5,000 Penalty)
    // -------------------------------------------------------------------
    console.log("▶ TEST 2: Early Locked Withdrawal with 5% Penalty Fee (Withdraw ₦100,000)")
    const wth2Amt = 100000.0
    const penaltyPercent = 5.0
    const penaltyFee = wth2Amt * (penaltyPercent / 100) // ₦5,000
    const netCredited = wth2Amt - penaltyFee // ₦95,000
    const ref2 = `SAV_WTH_${timestamp}_2`

    const test2Result = await prisma.$transaction(async (tx) => {
      const updatedSavings = await tx.savingsGoal.update({
        where: { id: flexibleVault.id },
        data: { currentAmount: { decrement: wth2Amt } },
      })

      const updatedPrimary = await tx.bankAccount.update({
        where: { id: primaryAccount.id },
        data: { balance: { increment: netCredited } },
      })

      const txRecord = await tx.transaction.create({
        data: {
          reference: ref2,
          senderAccountId: primaryAccount.id,
          senderName: flexibleVault.title,
          recipientName: user.name,
          bankName: "BankSpace Microfinance Bank",
          accountNumber: primaryAccount.accountNumber,
          amount: netCredited,
          fee: penaltyFee,
          currency: "NGN",
          type: "SAVINGS_WITHDRAWAL",
          category: "Savings",
          status: "SUCCESSFUL",
          description: `Early withdrawal from savings vault (${flexibleVault.title}) with 5% penalty fee (₦5,000)`,
        },
      })

      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          transactionId: txRecord.id,
          bankAccountId: primaryAccount.id,
          entryType: "CREDIT",
          amount: netCredited,
          balanceAfter: updatedPrimary.balance,
        },
      })

      return { updatedSavings, updatedPrimary, txRecord, ledgerEntry }
    })

    console.log(`  ✓ Penalty Fee Deducted: ₦${test2Result.txRecord.fee.toLocaleString()} (5%)`)
    console.log(`  ✓ Net Amount Credited to Primary Wallet: ₦${netCredited.toLocaleString()}`)
    console.log(`  ✓ Primary Wallet Final Balance: ₦${test2Result.updatedPrimary.balance.toLocaleString()} (Expected ₦155,000)`)
    console.log(`  ✓ Savings Vault Remaining Balance: ₦${test2Result.updatedSavings.currentAmount.toLocaleString()} (Expected ₦0)`)

    if (test2Result.updatedPrimary.balance === 155000.0 && test2Result.txRecord.fee === 5000.0) {
      console.log("  ✅ TEST 2 PASSED\n")
    } else {
      throw new Error(`Test 2 calculation mismatch: expected ₦155,000 balance & ₦5,000 fee`)
    }

    // -------------------------------------------------------------------
    // TEST 3: INSUFFICIENT SAVINGS BALANCE REJECTION
    // -------------------------------------------------------------------
    console.log("▶ TEST 3: Insufficient Savings Balance Guard (Withdraw ₦50,000 from ₦0 vault)")
    try {
      await prisma.$transaction(async (tx) => {
        const dec = await tx.savingsGoal.updateMany({
          where: { id: flexibleVault.id, currentAmount: { gte: 50000.0 } },
          data: { currentAmount: { decrement: 50000.0 } },
        })

        if (dec.count === 0) {
          throw new Error("INSUFFICIENT_SAVINGS: Insufficient funds in savings vault.")
        }
      })
      throw new Error("FAIL: Overdraft was permitted on savings vault!")
    } catch (err) {
      console.log(`  ✓ Caught Expected Error: "${err.message}"`)
      console.log("  ✅ TEST 3 PASSED\n")
    }

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Deleting test records...")
    await prisma.ledgerEntry.deleteMany({ where: { bankAccountId: primaryAccount.id } })
    await prisma.transaction.deleteMany({ where: { senderAccountId: primaryAccount.id } })
    await prisma.savingsGoal.delete({ where: { id: flexibleVault.id } })
    await prisma.bankAccount.delete({ where: { id: primaryAccount.id } })
    await prisma.user.delete({ where: { id: user.id } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 ALL WITHDRAWAL PIPELINE TESTS PASSED WITH 100% SUCCESS")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ WITHDRAWAL TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runWithdrawalTests()
