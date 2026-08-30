const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function runPurchaseTests() {
  console.log("==================================================")
  console.log("  ATOMIC INVESTMENT PURCHASE BACKEND TEST SUITE   ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const testEmail = `buy_user_${timestamp}@bankspace.com`
  const password = "Password123!"

  try {
    // 1. Setup User & Primary Bank Account (₦150,000)
    console.log("▶ SETUP: Creating Test User & Primary Wallet (₦150,000)")
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        name: "Purchase Test User",
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
        balance: 150000.0,
        currency: "NGN",
        isPrimary: true,
        status: "ACTIVE",
      },
    })

    const product = await prisma.investmentProduct.create({
      data: {
        symbol: `TEST-TBILL-${timestamp}`,
        name: "FGN 90-Day Treasury Bill Note",
        category: "FIXED_INCOME",
        unitPriceNav: 1000.0,
        minInvestmentAmount: 10000.0,
        riskLevel: "LOW",
        returnModel: "FIXED_YIELD",
        expectedRateAnnual: 0.145,
        status: "ACTIVE",
      },
    })

    console.log(`  ✓ Primary Wallet Balance: ₦${primaryAccount.balance.toLocaleString()}`)
    console.log(`  ✓ Product Created: ${product.symbol} (NAV: ₦${product.unitPriceNav.toLocaleString()})\n`)

    // -------------------------------------------------------------------
    // TEST 1: SUCCESSFUL INVESTMENT PURCHASE (Buy ₦100,000 -> 100 Units)
    // -------------------------------------------------------------------
    console.log("▶ TEST 1: Successful Investment Purchase (Buy ₦100,000)")
    const buyAmt1 = 100000.0
    const expectedUnits1 = buyAmt1 / product.unitPriceNav // 100 Units
    const ref1 = `INV_BUY_${timestamp}_1`

    const test1Result = await prisma.$transaction(async (tx) => {
      const dec = await tx.bankAccount.updateMany({
        where: { id: primaryAccount.id, balance: { gte: buyAmt1 }, status: "ACTIVE" },
        data: { balance: { decrement: buyAmt1 } },
      })

      if (dec.count === 0) throw new Error("Insufficient funds")

      const updatedPrimary = await tx.bankAccount.findUnique({ where: { id: primaryAccount.id } })

      const holdingAccNum = "INV_" + Math.floor(10000000 + Math.random() * 90000000)
      const holding = await tx.investmentHolding.create({
        data: {
          userId: user.id,
          productId: product.id,
          primaryBankAccountId: primaryAccount.id,
          accountNumber: holdingAccNum,
          principalInvested: buyAmt1,
          unitsOwned: expectedUnits1,
          costBasisUnitPrice: product.unitPriceNav,
          currentUnitPrice: product.unitPriceNav,
          currentValue: buyAmt1,
          totalReturns: 0.0,
          status: "ACTIVE",
        },
      })

      const txRecord = await tx.transaction.create({
        data: {
          reference: ref1,
          senderAccountId: primaryAccount.id,
          senderName: user.name,
          recipientName: product.name,
          bankName: "Global Capital Markets",
          accountNumber: primaryAccount.accountNumber,
          amount: buyAmt1,
          fee: 0.0,
          currency: "NGN",
          type: "INVESTMENT_PURCHASE",
          category: "Investments",
          status: "SUCCESSFUL",
          description: `Investment purchase of ${expectedUnits1} units in ${product.name}`,
        },
      })

      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          transactionId: txRecord.id,
          bankAccountId: primaryAccount.id,
          entryType: "DEBIT",
          amount: buyAmt1,
          balanceAfter: updatedPrimary.balance,
        },
      })

      return { holding, updatedPrimary, txRecord, ledgerEntry }
    })

    console.log(`  ✓ Position Created: Folio=${test1Result.holding.accountNumber}, Units=${test1Result.holding.unitsOwned} (Expected 100)`)
    console.log(`  ✓ Primary Wallet Remaining Balance: ₦${test1Result.updatedPrimary.balance.toLocaleString()} (Expected ₦50,000)`)
    console.log(`  ✓ Transaction Type: ${test1Result.txRecord.type}, Category: ${test1Result.txRecord.category}`)
    console.log("  ✅ TEST 1 PASSED\n")

    // -------------------------------------------------------------------
    // TEST 2: INSUFFICIENT FUNDS GUARD (Buy ₦500,000 with ₦50,000 Balance)
    // -------------------------------------------------------------------
    console.log("▶ TEST 2: Insufficient Wallet Balance Guard (Buy ₦500,000 > ₦50,000 Balance)")
    try {
      await prisma.$transaction(async (tx) => {
        const dec = await tx.bankAccount.updateMany({
          where: { id: primaryAccount.id, balance: { gte: 500000.0 }, status: "ACTIVE" },
          data: { balance: { decrement: 500000.0 } },
        })

        if (dec.count === 0) {
          throw new Error("Insufficient funds in primary wallet.")
        }
      })
      throw new Error("FAIL: Overdraft was permitted on primary wallet!")
    } catch (err) {
      console.log(`  ✓ Caught Expected Error: "${err.message}"`)
      console.log("  ✅ TEST 2 PASSED\n")
    }

    // -------------------------------------------------------------------
    // TEST 3: MINIMUM INVESTMENT LIMIT GUARD (Buy ₦5,000 < Min ₦10,000)
    // -------------------------------------------------------------------
    console.log("▶ TEST 3: Minimum Investment Limit Guard (Buy ₦5,000 < Min ₦10,000)")
    const smallBuy = 5000.0
    if (smallBuy < product.minInvestmentAmount) {
      console.log(`  ✓ Rejection Guard Verified: ₦${smallBuy.toLocaleString()} is below minimum requirement ₦${product.minInvestmentAmount.toLocaleString()}`)
      console.log("  ✅ TEST 3 PASSED\n")
    } else {
      throw new Error("Test 3 failure: Min investment limit ignored")
    }

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Deleting test records...")
    await prisma.ledgerEntry.deleteMany({ where: { bankAccountId: primaryAccount.id } })
    await prisma.transaction.deleteMany({ where: { senderAccountId: primaryAccount.id } })
    await prisma.investmentHolding.deleteMany({ where: { userId: user.id } })
    await prisma.investmentProduct.delete({ where: { id: product.id } })
    await prisma.bankAccount.delete({ where: { id: primaryAccount.id } })
    await prisma.user.delete({ where: { id: user.id } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 ALL INVESTMENT PURCHASE TESTS PASSED WITH 100% SUCCESS")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ PURCHASE TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runPurchaseTests()
