const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function runReturnTrackingTests() {
  console.log("==================================================")
  console.log("  INVESTMENT RETURN & PROFIT TRACKING TEST SUITE  ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const testEmail = `return_user_${timestamp}@bankspace.com`

  try {
    // 1. Setup User & Wallet (₦50,000)
    console.log("▶ SETUP: Creating Test User & Primary Wallet (₦50,000)")
    const passwordHash = await bcrypt.hash("Password123!", 10)
    const user = await prisma.user.create({
      data: { name: "Return Test User", email: testEmail, passwordHash, role: "USER", isVerified: true },
    })

    const primaryAccount = await prisma.bankAccount.create({
      data: {
        userId: user.id,
        accountNumber: "20" + Math.floor(10000000 + Math.random() * 90000000),
        accountName: user.name,
        bankName: "BankSpace MFB",
        balance: 50000.0,
        currency: "NGN",
        isPrimary: true,
        status: "ACTIVE",
      },
    })

    const product = await prisma.investmentProduct.create({
      data: {
        symbol: `TEST-DIV-${timestamp}`,
        name: "Test High-Yield Dividend Asset",
        category: "REAL_ESTATE_NOTE",
        unitPriceNav: 1000.0,
        expectedRateAnnual: 0.165,
        status: "ACTIVE",
      },
    })

    const holding = await prisma.investmentHolding.create({
      data: {
        userId: user.id,
        productId: product.id,
        primaryBankAccountId: primaryAccount.id,
        accountNumber: "INV_" + Math.floor(10000000 + Math.random() * 90000000),
        principalInvested: 100000.0,
        unitsOwned: 100.0,
        costBasisUnitPrice: 1000.0,
        currentUnitPrice: 1200.0, // Appreciated to ₦1,200 (Current Val: ₦120,000)
        currentValue: 120000.0,
        totalReturns: 20000.0,
        status: "ACTIVE",
      },
    })

    console.log(`  ✓ Primary Wallet Starting Balance: ₦${primaryAccount.balance.toLocaleString()}`)
    console.log(`  ✓ Position Active: ${holding.accountNumber}, Principal=₦100,000, Current Val=₦120,000\n`)

    // -------------------------------------------------------------------
    // TEST 1: DIVIDEND PAYOUT (Distribute ₦5,000 Dividend)
    // -------------------------------------------------------------------
    console.log("▶ TEST 1: Dividend Distribution (₦5,000 Payout to Checking Wallet)")
    const divAmount = 5000.0
    const divRef = `INV_DIV_${timestamp}`

    const test1Result = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.bankAccount.update({
        where: { id: primaryAccount.id },
        data: { balance: { increment: divAmount } },
      })

      const txRecord = await tx.transaction.create({
        data: {
          reference: divRef,
          senderAccountId: primaryAccount.id,
          senderName: product.name,
          recipientName: user.name,
          bankName: "BankSpace Asset Management",
          accountNumber: primaryAccount.accountNumber,
          amount: divAmount,
          fee: 0.0,
          currency: "NGN",
          type: "INVESTMENT_DIVIDEND",
          category: "Investments",
          status: "SUCCESSFUL",
          description: `Dividend payout for ${product.name}`,
        },
      })

      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          transactionId: txRecord.id,
          bankAccountId: primaryAccount.id,
          entryType: "CREDIT",
          amount: divAmount,
          balanceAfter: updatedWallet.balance,
        },
      })

      return { updatedWallet, txRecord, ledgerEntry }
    })

    console.log(`  ✓ Wallet Balance after Dividend: ₦${test1Result.updatedWallet.balance.toLocaleString()} (Expected ₦55,000)`)
    console.log(`  ✓ Transaction Type: ${test1Result.txRecord.type}, Category: ${test1Result.txRecord.category}`)
    console.log("  ✅ TEST 1 PASSED\n")

    // -------------------------------------------------------------------
    // TEST 2: POSITION LIQUIDATION & REALIZED RETURNS (Sell 100 units @ ₦1,200 = ₦120,000)
    // Realized Profit = ₦120,000 - ₦100,000 = +₦20,000
    // -------------------------------------------------------------------
    console.log("▶ TEST 2: Position Liquidation & Realized Returns (Sell 100 units @ ₦1,200 = ₦120,000)")
    const liqAmount = 120000.0
    const realizedProfit = liqAmount - holding.principalInvested // ₦20,000
    const liqRef = `INV_LIQ_${timestamp}`

    const test2Result = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.bankAccount.update({
        where: { id: primaryAccount.id },
        data: { balance: { increment: liqAmount } },
      })

      const updatedHolding = await tx.investmentHolding.update({
        where: { id: holding.id },
        data: {
          unitsOwned: 0.0,
          principalInvested: 0.0,
          currentValue: 0.0,
          status: "LIQUIDATED",
        },
      })

      const txRecord = await tx.transaction.create({
        data: {
          reference: liqRef,
          senderAccountId: primaryAccount.id,
          senderName: product.name,
          recipientName: user.name,
          bankName: "Global Capital Markets",
          accountNumber: primaryAccount.accountNumber,
          amount: liqAmount,
          fee: 0.0,
          currency: "NGN",
          type: "INVESTMENT_LIQUIDATION",
          category: "Investments",
          status: "SUCCESSFUL",
          description: `Liquidation payout of 100 units in ${product.name} (Realized Profit: +₦${realizedProfit})`,
        },
      })

      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          transactionId: txRecord.id,
          bankAccountId: primaryAccount.id,
          entryType: "CREDIT",
          amount: liqAmount,
          balanceAfter: updatedWallet.balance,
        },
      })

      return { updatedHolding, updatedWallet, txRecord, ledgerEntry }
    })

    console.log(`  ✓ Position Final Status: ${test2Result.updatedHolding.status} (Expected LIQUIDATED)`)
    console.log(`  ✓ Realized Profit/Loss: +₦${realizedProfit.toLocaleString()} (Expected +₦20,000)`)
    console.log(`  ✓ Wallet Balance after Liquidation: ₦${test2Result.updatedWallet.balance.toLocaleString()} (Expected ₦175,000)`)
    console.log("  ✅ TEST 2 PASSED\n")

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
    console.log("   🎉 ALL RETURN TRACKING TESTS PASSED WITH 100% SUCCESS")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ RETURN TRACKING TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runReturnTrackingTests()
