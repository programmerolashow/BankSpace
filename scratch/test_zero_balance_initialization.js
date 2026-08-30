const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function testZeroBalanceInitialization() {
  console.log("==================================================")
  console.log("  TEST: ZERO-BALANCE ACCOUNT INITIALIZATION AUDIT ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const testEmail = `zero_bal_user_${timestamp}@bankspace.com`

  try {
    // Step 1: Create New User
    console.log("▶ STEP 1: Creating New User...")
    const passwordHash = await bcrypt.hash("Password123!", 10)
    const user = await prisma.user.create({
      data: {
        name: "Zero Balance User",
        email: testEmail,
        passwordHash,
        role: "USER",
        isVerified: true,
      },
    })
    console.log(`  ✓ New User Created: ID=${user.id}, Email=${user.email}`)

    // Step 2: Create Wallet (Using Model Defaults)
    console.log("▶ STEP 2: Creating Primary Liquid Wallet (Using Model Defaults)...")
    const wallet = await prisma.bankAccount.create({
      data: {
        userId: user.id,
        accountNumber: "20" + Math.floor(10000000 + Math.random() * 90000000),
        accountName: user.name,
        bankName: "BankSpace MFB",
        // Notice: NO explicit balance provided! Relying on schema default.
      },
    })
    console.log(`  ✓ Primary Wallet Created: Account Number=${wallet.accountNumber}`)

    // Step 3: Fetch Wallet
    console.log("▶ STEP 3: Fetching Wallet from Database...")
    const fetchedWallet = await prisma.bankAccount.findUnique({
      where: { id: wallet.id },
    })

    console.log(`  ✓ Fetched Wallet Raw Balance: ${fetchedWallet.balance}`)
    const formattedBalance = `₦${fetchedWallet.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    console.log(`  ✓ Formatted Wallet Balance Display: "${formattedBalance}"`)

    // Step 4: Verification Assertions
    console.log("▶ STEP 4: Verifying Zero-Balance Constraints...")
    if (fetchedWallet.balance !== 0.0) {
      throw new Error(`FAIL: Expected raw balance = 0.0, but got ${fetchedWallet.balance}`)
    }

    if (formattedBalance !== "₦0.00") {
      throw new Error(`FAIL: Expected formatted balance = "₦0.00", but got "${formattedBalance}"`)
    }

    console.log("  ✅ ASSERTION PASSED: Raw Balance = 0.0, Formatted = ₦0.00")
    console.log("  ✅ ZERO INVENTED / MOCKED / SEEDED FUNDS DETECTED!")

    // Cleanup
    console.log("\n▶ CLEANUP: Deleting test account...")
    await prisma.bankAccount.delete({ where: { id: wallet.id } })
    await prisma.user.delete({ where: { id: user.id } })
    console.log("  ✓ Cleanup complete.")

    console.log("\n==================================================")
    console.log("   🎉 ZERO-BALANCE ACCOUNT INITIALIZATION TEST PASSED!")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ ZERO-BALANCE TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testZeroBalanceInitialization()
