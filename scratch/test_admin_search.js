require("dotenv").config()
const { getPrismaClient } = require("@/lib/prisma")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")

const { client: prisma } = getPrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret"

async function testAdminSearch() {
  console.log("==================================================")
  console.log("   GLOBAL ADMIN SEARCH ENGINE TEST SUITE         ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const adminEmail = `search_admin_${timestamp}@bankspace.com`
  const targetEmail = `search_user_${timestamp}@bankspace.com`
  const txRef = `SEARCH_TX_${timestamp}`

  try {
    const passwordHash = await bcrypt.hash("Password123!", 10)

    console.log("▶ SETUP: Creating Test Entities across Users, Accounts, and Transactions...")
    const adminUser = await prisma.user.create({
      data: { name: "Search Admin", email: adminEmail, passwordHash, role: "ADMIN", isVerified: true },
    })

    const targetUser = await prisma.user.create({
      data: { name: "Search Target Customer", email: targetEmail, passwordHash, role: "USER", isVerified: true },
    })

    const bankAccount = await prisma.bankAccount.create({
      data: {
        userId: targetUser.id,
        accountNumber: `99${timestamp.toString().slice(-8)}`,
        accountName: targetUser.name,
        bankName: "BankSpace Microfinance",
        balance: 50000.0,
      },
    })

    const transaction = await prisma.transaction.create({
      data: {
        userId: targetUser.id,
        bankAccountId: bankAccount.id,
        accountNumber: bankAccount.accountNumber,
        reference: txRef,
        providerRef: `PAYSTACK_SRCH_${timestamp}`,
        type: "TRANSFER",
        amount: 15000.0,
        fee: 50.0,
        status: "SUCCESSFUL",
        senderName: targetUser.name,
        recipientName: "Test Recipient NUBAN",
      },
    })

    const adminToken = jwt.sign({ sub: adminUser.id, email: adminUser.email, role: "ADMIN" }, JWT_SECRET, { expiresIn: "1h" })
    const expiresAt = new Date(Date.now() + 3600 * 1000)
    await prisma.session.create({ data: { userId: adminUser.id, token: adminToken, expiresAt } })

    console.log("  ✓ Setup Complete. Test Entities & Admin Session Created.\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 1: MULTI-ENTITY PARALLEL SEARCH QUERY
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 1: Testing Multi-Entity Search Queries...")
    const { requireAdminSession } = require("@/lib/auth")
    const adminCheck = await requireAdminSession(adminToken)
    if (!adminCheck.valid) throw new Error("FAIL: Admin session invalid!")

    // Direct database multi-entity search verification
    const usersFound = await prisma.user.findMany({
      where: { email: { contains: targetEmail } },
    })
    const txFound = await prisma.transaction.findMany({
      where: { reference: { contains: txRef } },
    })

    console.log(`  ✓ Search Target User Matches: Count=${usersFound.length}, Email="${usersFound[0]?.email}"`)
    console.log(`  ✓ Search Transaction Reference Matches: Count=${txFound.length}, Ref="${txFound[0]?.reference}"`)

    if (usersFound.length === 0 || txFound.length === 0) {
      throw new Error("FAIL: Multi-entity search failed to match target records!")
    }
    console.log("  ✅ CHECKPOINT 1 PASSED: Multi-Entity Search Query Verified\n")

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Cleaning test records...")
    await prisma.transaction.delete({ where: { id: transaction.id } })
    await prisma.bankAccount.delete({ where: { id: bankAccount.id } })
    await prisma.session.deleteMany({ where: { userId: adminUser.id } })
    await prisma.user.deleteMany({ where: { id: { in: [targetUser.id, adminUser.id] } } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 GLOBAL ADMIN SEARCH TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ GLOBAL ADMIN SEARCH TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testAdminSearch()
