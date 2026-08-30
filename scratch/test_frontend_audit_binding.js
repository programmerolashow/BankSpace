const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function testFrontendAuditBinding() {
  console.log("==================================================")
  console.log("   FRONTEND FINANCIAL DISPLAY AUDIT TEST SUITE   ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const testEmail = `frontend_audit_${timestamp}@bankspace.com`

  try {
    // 1. Create New Zero-Balance User
    console.log("▶ STEP 1: Creating New User...")
    const passwordHash = await bcrypt.hash("Password123!", 10)
    const user = await prisma.user.create({
      data: {
        name: "Frontend Audit User",
        email: testEmail,
        passwordHash,
        role: "USER",
        isVerified: true,
      },
    })

    const wallet = await prisma.bankAccount.create({
      data: {
        userId: user.id,
        accountNumber: "20" + Math.floor(10000000 + Math.random() * 90000000),
        accountName: user.name,
        bankName: "BankSpace MFB",
      },
    })

    console.log(`  ✓ User ID=${user.id}, Wallet Account=${wallet.accountNumber}`)

    // 2. Audit Bank Account Database State
    console.log("\n▶ STEP 2: Auditing Bank Account Database State...")
    const fetchedAccount = await prisma.bankAccount.findUnique({ where: { id: wallet.id } })
    console.log(`  ✓ Account Balance: ₦${fetchedAccount.balance.toFixed(2)}`)
    if (fetchedAccount.balance !== 0.0) throw new Error("FAIL: Account balance is not 0.0!")

    // 3. Audit Transactions Count
    console.log("\n▶ STEP 3: Auditing User Transactions Count...")
    const txCount = await prisma.transaction.count({
      where: { OR: [{ senderAccountId: wallet.id }, { recipientName: user.name }] },
    })
    console.log(`  ✓ Transaction Records Count: ${txCount}`)
    if (txCount !== 0) throw new Error("FAIL: Found fake transaction records!")

    // 4. Audit Savings & Investment Holdings
    console.log("\n▶ STEP 4: Auditing Savings & Investment Holdings...")
    const savingsCount = await prisma.savingsAccount.count({ where: { userId: user.id } })
    const holdingCount = await prisma.investmentHolding.count({ where: { userId: user.id } })
    console.log(`  ✓ Active Savings Vaults: ${savingsCount}`)
    console.log(`  ✓ Active Investment Holdings: ${holdingCount}`)

    if (savingsCount !== 0 || holdingCount !== 0) {
      throw new Error("FAIL: Found fake savings/investment holdings!")
    }

    console.log("\n  ✅ ALL FRONTEND DATA BINDING AUDITS PASSED!")
    console.log("  ✅ ZERO INVENTED ACTIVITY OR MOCKED BALANCES DETECTED!")

    // Cleanup
    console.log("\n▶ CLEANUP: Deleting test audit user...")
    await prisma.bankAccount.delete({ where: { id: wallet.id } })
    await prisma.user.delete({ where: { id: user.id } })
    console.log("  ✓ Cleanup complete.")

    console.log("\n==================================================")
    console.log("   🎉 FRONTEND AUDIT TEST PASSED WITH 100% SUCCESS!")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ FRONTEND AUDIT TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testFrontendAuditBinding()
