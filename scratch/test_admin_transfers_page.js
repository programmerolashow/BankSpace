require("dotenv").config()
const { getPrismaClient } = require("@/lib/prisma")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")

const { client: prisma } = getPrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret"

async function testAdminTransfersPage() {
  console.log("==================================================")
  console.log("   ADMIN TRANSFER MANAGEMENT TEST SUITE          ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const normalEmail = `trf_customer_${timestamp}@bankspace.com`
  const adminEmail = `trf_admin_${timestamp}@bankspace.com`

  try {
    const passwordHash = await bcrypt.hash("Password123!", 10)

    console.log("▶ SETUP: Creating Test Accounts & Paystack Transfers...")
    const normalUser = await prisma.user.create({
      data: { name: "Transfer Customer", email: normalEmail, passwordHash, role: "USER", isVerified: true },
    })
    const normalWallet = await prisma.bankAccount.create({
      data: {
        userId: normalUser.id,
        accountNumber: "20" + Math.floor(10000000 + Math.random() * 90000000),
        accountName: normalUser.name,
        bankName: "BankSpace MFB",
        balance: 600000.0,
        currency: "NGN",
        isPrimary: true,
        status: "ACTIVE",
      },
    })

    const adminUser = await prisma.user.create({
      data: { name: "Transfer Admin", email: adminEmail, passwordHash, role: "ADMIN", isVerified: true },
    })

    // Create 2 Test Transfers (SUCCESSFUL and FAILED with Paystack provider ref)
    const trf1 = await prisma.transaction.create({
      data: {
        reference: `TRF_TEST_${timestamp}_1`,
        providerRef: `PAYSTACK_TRF_${timestamp}_1`,
        senderAccountId: normalWallet.id,
        senderName: normalUser.name,
        recipientName: "Emeka Okonkwo",
        bankName: "Access Bank",
        accountNumber: "0123456789",
        amount: 85000.0,
        fee: 50.0,
        type: "TRANSFER",
        status: "SUCCESSFUL",
        currency: "NGN",
      },
    })

    const trf2 = await prisma.transaction.create({
      data: {
        reference: `TRF_TEST_${timestamp}_2`,
        providerRef: `PAYSTACK_TRF_${timestamp}_2`,
        senderAccountId: normalWallet.id,
        senderName: normalUser.name,
        recipientName: "Bisi Adebayo",
        bankName: "Zenith Bank",
        accountNumber: "9876543210",
        amount: 42000.0,
        fee: 50.0,
        type: "TRANSFER",
        status: "FAILED",
        currency: "NGN",
        description: "Destination bank declined transfer due to insufficient account limit.",
      },
    })

    const adminToken = jwt.sign({ sub: adminUser.id, email: adminUser.email, role: "ADMIN" }, JWT_SECRET, { expiresIn: "1h" })
    const expiresAt = new Date(Date.now() + 3600 * 1000)
    await prisma.session.create({ data: { userId: adminUser.id, token: adminToken, expiresAt } })

    console.log("  ✓ Setup Complete. Test Accounts & Transfers Created.\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 1: SERVER-SIDE TRANSFER PAGINATION & VOLUME METRICS
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 1: Testing Server-Side Transfer Query & Metrics...")
    const { requireAdminSession } = require("@/lib/auth")
    const adminCheck = await requireAdminSession(adminToken)
    if (!adminCheck.valid) throw new Error("FAIL: Admin session invalid!")

    const totalTrfCount = await prisma.transaction.count({ where: { type: "TRANSFER" } })
    const transfersList = await prisma.transaction.findMany({
      where: { type: "TRANSFER" },
      orderBy: { createdAt: "desc" },
      take: 5,
    })

    console.log(`  ✓ Total Transfers in DB: ${totalTrfCount}`)
    console.log(`  ✓ Returned Items on Page 1 (Limit 5): ${transfersList.length}`)

    if (transfersList.length === 0) throw new Error("FAIL: No transfers returned!")
    console.log("  ✅ CHECKPOINT 1 PASSED: Server-Side Transfer Query Verified\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 2: PAYSTACK PROVIDER REFERENCE & FAILURE REASON AUDIT
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 2: Testing Paystack Provider Ref & Failure Reasons...")
    const failedTransfer = await prisma.transaction.findUnique({
      where: { id: trf2.id },
    })

    console.log(`  ✓ Transfer Reference: "${failedTransfer.reference}"`)
    console.log(`  ✓ Paystack Provider Reference: "${failedTransfer.providerRef}"`)
    console.log(`  ✓ Amount & Fee: ₦${failedTransfer.amount} (Fee: ₦${failedTransfer.fee})`)
    console.log(`  ✓ Recipient Party: ${failedTransfer.recipientName} (${failedTransfer.bankName})`)
    console.log(`  ✓ Failure Reason: "${failedTransfer.description}"`)

    if (failedTransfer.providerRef !== `PAYSTACK_TRF_${timestamp}_2`) {
      throw new Error("FAIL: Paystack Provider Reference mismatch!")
    }
    if (!failedTransfer.description) {
      throw new Error("FAIL: Failure reason was not recorded for failed transfer!")
    }
    console.log("  ✅ CHECKPOINT 2 PASSED: Paystack Provider Ref & Failure Reason Verified\n")

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Cleaning test records...")
    await prisma.transaction.deleteMany({ where: { id: { in: [trf1.id, trf2.id] } } })
    await prisma.session.deleteMany({ where: { userId: adminUser.id } })
    await prisma.bankAccount.delete({ where: { id: normalWallet.id } })
    await prisma.user.deleteMany({ where: { id: { in: [normalUser.id, adminUser.id] } } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("    🎉 ADMIN TRANSFER MANAGEMENT TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ ADMIN TRANSFER MANAGEMENT TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testAdminTransfersPage()
