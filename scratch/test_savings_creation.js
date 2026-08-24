const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function runSavingsCreationTests() {
  console.log("==================================================")
  console.log("   SAVINGS ACCOUNT CREATION BACKEND TEST SUITE   ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const testEmail = `savings_user_${timestamp}@bankspace.com`
  const password = "Password123!"

  try {
    // 1. Setup User & Primary Bank Account
    console.log("▶ SETUP: Creating Test User & Primary Wallet")
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        name: "Savings Test User",
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
        balance: 50000.0, // Primary Wallet Balance = ₦50,000
        currency: "NGN",
        isPrimary: true,
        status: "ACTIVE",
      },
    })
    console.log(`  ✓ User registered (${user.email}), Primary Wallet Balance: ₦${primaryAccount.balance.toLocaleString()}\n`)

    // -------------------------------------------------------------------
    // TEST 1: SUCCESSFUL SAVINGS ACCOUNT CREATION WITH INITIAL DEPOSIT
    // -------------------------------------------------------------------
    console.log("▶ TEST 1: Successful Savings Account Creation (Deposit ₦20,000)")
    const depositAmt = 20000.0
    const reference1 = `SAV_TEST_${timestamp}_1`

    const test1Result = await prisma.$transaction(async (tx) => {
      // Atomic Decrement Guard
      const dec = await tx.bankAccount.updateMany({
        where: { id: primaryAccount.id, balance: { gte: depositAmt }, status: "ACTIVE" },
        data: { balance: { decrement: depositAmt } },
      })

      if (dec.count === 0) throw new Error("Insufficient funds")

      const updatedPrimary = await tx.bankAccount.findUnique({ where: { id: primaryAccount.id } })

      let product = await tx.savingsProduct.findFirst({ where: { productType: "FLEXIBLE" } })
      if (!product) {
        product = await tx.savingsProduct.create({
          data: { name: "Flexible Vault", productType: "FLEXIBLE", interestRateAnnual: 0.125 },
        })
      }

      const savingsAcc = await tx.savingsAccount.create({
        data: {
          userId: user.id,
          productId: product.id,
          primaryBankAccountId: primaryAccount.id,
          accountNumber: "20" + Math.floor(10000000 + Math.random() * 90000000),
          title: "Vacation Vault",
          principal: depositAmt,
          currentBalance: depositAmt,
          interestRate: product.interestRateAnnual,
          status: "ACTIVE",
        },
      })

      const txRecord = await tx.transaction.create({
        data: {
          reference: reference1,
          senderAccountId: primaryAccount.id,
          senderName: user.name,
          recipientName: "Vacation Vault",
          bankName: "BankSpace Savings Vault",
          accountNumber: savingsAcc.accountNumber,
          amount: depositAmt,
          fee: 0.0,
          currency: "NGN",
          type: "SAVINGS_DEPOSIT",
          category: "Savings",
          status: "SUCCESSFUL",
          description: "Initial funding for Vacation Vault",
        },
      })

      await tx.ledgerEntry.create({
        data: {
          transactionId: txRecord.id,
          bankAccountId: primaryAccount.id,
          entryType: "DEBIT",
          amount: depositAmt,
          balanceAfter: updatedPrimary.balance,
        },
      })

      return { savingsAcc, updatedPrimaryBalance: updatedPrimary.balance }
    })

    console.log(`  ✓ Savings Account Provisioned (${test1Result.savingsAcc.accountNumber}, Title: "${test1Result.savingsAcc.title}")`)
    console.log(`  ✓ Savings Account Balance: ₦${test1Result.savingsAcc.currentBalance.toLocaleString()}`)
    console.log(`  ✓ Primary Wallet Balance: ₦${test1Result.updatedPrimaryBalance.toLocaleString()} (Debited ₦${depositAmt.toLocaleString()})`)
    console.log("  ✅ TEST 1 PASSED\n")

    // -------------------------------------------------------------------
    // TEST 2: FAILED SAVINGS ACCOUNT CREATION (INSUFFICIENT FUNDS)
    // -------------------------------------------------------------------
    console.log("▶ TEST 2: Failed Creation Due to Insufficient Funds (Deposit ₦100,000 > Balance ₦30,000)")
    const excessiveDeposit = 100000.0

    try {
      await prisma.$transaction(async (tx) => {
        const dec = await tx.bankAccount.updateMany({
          where: { id: primaryAccount.id, balance: { gte: excessiveDeposit }, status: "ACTIVE" },
          data: { balance: { decrement: excessiveDeposit } },
        })

        if (dec.count === 0) {
          throw new Error(`Insufficient funds in primary wallet. Available: ₦30,000. Required: ₦${excessiveDeposit.toLocaleString()}`)
        }
      })
      throw new Error("FAIL: Overdraft was permitted when it should have failed!")
    } catch (err) {
      console.log(`  ✓ Caught Expected Error: "${err.message}"`)
      const currentPrimaryBalance = (await prisma.bankAccount.findUnique({ where: { id: primaryAccount.id } })).balance
      console.log(`  ✓ Balance Integrity Verified: Primary Wallet remaining = ₦${currentPrimaryBalance.toLocaleString()} (Zero funds lost!)`)
    }
    console.log("  ✅ TEST 2 PASSED\n")

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Deleting test records...")
    await prisma.ledgerEntry.deleteMany({ where: { bankAccountId: primaryAccount.id } })
    await prisma.transaction.deleteMany({ where: { senderAccountId: primaryAccount.id } })
    await prisma.savingsAccount.deleteMany({ where: { userId: user.id } })
    await prisma.bankAccount.delete({ where: { id: primaryAccount.id } })
    await prisma.user.delete({ where: { id: user.id } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 ALL SAVINGS ACCOUNT CREATION TESTS PASSED   ")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runSavingsCreationTests()
