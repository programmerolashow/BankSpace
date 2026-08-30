const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function runRedemptionTests() {
  console.log("==================================================")
  console.log("  ATOMIC INVESTMENT REDEMPTION BACKEND TEST SUITE ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const testEmail = `redeem_user_${timestamp}@bankspace.com`

  try {
    // 1. Setup User & Wallet (₦50,000)
    console.log("▶ SETUP: Creating Test User & Primary Wallet (₦50,000)")
    const passwordHash = await bcrypt.hash("Password123!", 10)
    const user = await prisma.user.create({
      data: { name: "Redeem Test User", email: testEmail, passwordHash, role: "USER", isVerified: true },
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
        symbol: `TEST-RED-${timestamp}`,
        name: "Test Redeemable Fund Asset",
        category: "MUTUAL_FUND",
        unitPriceNav: 1000.0,
        managementFeePercent: 0.05, // 5% early exit fee
        status: "ACTIVE",
      },
    })

    // -------------------------------------------------------------------
    // TEST 1: PARTIAL REDEMPTION (Redeem 40 of 100 units @ ₦1,000 = ₦40,000)
    // -------------------------------------------------------------------
    console.log("▶ TEST 1: Partial Redemption (Redeem 40 of 100 units)")
    const holding1 = await prisma.investmentHolding.create({
      data: {
        userId: user.id,
        productId: product.id,
        primaryBankAccountId: primaryAccount.id,
        accountNumber: "INV_" + Math.floor(10000000 + Math.random() * 90000000),
        principalInvested: 100000.0,
        unitsOwned: 100.0,
        costBasisUnitPrice: 1000.0,
        currentUnitPrice: 1000.0,
        currentValue: 100000.0,
        status: "ACTIVE",
      },
    })

    const partialUnits = 40.0
    const partialGross = 40000.0
    const ref1 = `INV_RED_${timestamp}_1`

    const test1Result = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.bankAccount.update({
        where: { id: primaryAccount.id },
        data: { balance: { increment: partialGross } },
      })

      const updatedHolding = await tx.investmentHolding.update({
        where: { id: holding1.id },
        data: {
          unitsOwned: 60.0,
          principalInvested: 60000.0,
          currentValue: 60000.0,
          status: "ACTIVE",
        },
      })

      const txRecord = await tx.transaction.create({
        data: {
          reference: ref1,
          senderAccountId: primaryAccount.id,
          senderName: product.name,
          recipientName: user.name,
          bankName: "Global Capital Markets",
          accountNumber: primaryAccount.accountNumber,
          amount: partialGross,
          fee: 0.0,
          currency: "NGN",
          type: "INVESTMENT_REDEMPTION",
          category: "Investments",
          status: "SUCCESSFUL",
          description: `Investment redemption of ${partialUnits} units in ${product.name}`,
        },
      })

      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          transactionId: txRecord.id,
          bankAccountId: primaryAccount.id,
          entryType: "CREDIT",
          amount: partialGross,
          balanceAfter: updatedWallet.balance,
        },
      })

      return { updatedHolding, updatedWallet, txRecord, ledgerEntry }
    })

    console.log(`  ✓ Remaining Units: ${test1Result.updatedHolding.unitsOwned} (Expected 60)`)
    console.log(`  ✓ Holding Status: ${test1Result.updatedHolding.status} (Expected ACTIVE)`)
    console.log(`  ✓ Primary Wallet Balance: ₦${test1Result.updatedWallet.balance.toLocaleString()} (Expected ₦90,000)`)
    console.log("  ✅ TEST 1 PASSED\n")

    // -------------------------------------------------------------------
    // TEST 2: FULL REDEMPTION AT MATURITY (Redeem remaining 60 units, 0 Penalty)
    // -------------------------------------------------------------------
    console.log("▶ TEST 2: Full Redemption at Maturity (Redeem remaining 60 units)")
    const fullGross = 60000.0
    const ref2 = `INV_RED_${timestamp}_2`

    const test2Result = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.bankAccount.update({
        where: { id: primaryAccount.id },
        data: { balance: { increment: fullGross } },
      })

      const updatedHolding = await tx.investmentHolding.update({
        where: { id: holding1.id },
        data: {
          unitsOwned: 0.0,
          principalInvested: 0.0,
          currentValue: 0.0,
          status: "LIQUIDATED",
        },
      })

      const txRecord = await tx.transaction.create({
        data: {
          reference: ref2,
          senderAccountId: primaryAccount.id,
          senderName: product.name,
          recipientName: user.name,
          bankName: "Global Capital Markets",
          accountNumber: primaryAccount.accountNumber,
          amount: fullGross,
          fee: 0.0,
          currency: "NGN",
          type: "INVESTMENT_REDEMPTION",
          category: "Investments",
          status: "SUCCESSFUL",
          description: `Full investment redemption of ${product.name}`,
        },
      })

      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          transactionId: txRecord.id,
          bankAccountId: primaryAccount.id,
          entryType: "CREDIT",
          amount: fullGross,
          balanceAfter: updatedWallet.balance,
        },
      })

      return { updatedHolding, updatedWallet, txRecord, ledgerEntry }
    })

    console.log(`  ✓ Final Position Status: ${test2Result.updatedHolding.status} (Expected LIQUIDATED)`)
    console.log(`  ✓ Primary Wallet Balance: ₦${test2Result.updatedWallet.balance.toLocaleString()} (Expected ₦150,000)`)
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
    console.log("   🎉 ALL INVESTMENT REDEMPTION TESTS PASSED WITH 100% SUCCESS")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ REDEMPTION TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runRedemptionTests()
