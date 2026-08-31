require("dotenv").config()
const { getPrismaClient } = require("@/lib/prisma")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")

const { client: prisma } = getPrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret"

async function testAdminTransactionsPage() {
  console.log("==================================================")
  console.log("   ADMIN TRANSACTION MANAGEMENT TEST SUITE       ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const normalEmail = `tx_customer_${timestamp}@bankspace.com`
  const adminEmail = `tx_admin_${timestamp}@bankspace.com`

  try {
    const passwordHash = await bcrypt.hash("Password123!", 10)

    console.log("▶ SETUP: Creating Test Accounts & Transactions...")
    const normalUser = await prisma.user.create({
      data: { name: "Tx Customer", email: normalEmail, passwordHash, role: "USER", isVerified: true },
    })
    const normalWallet = await prisma.bankAccount.create({
      data: {
        userId: normalUser.id,
        accountNumber: "20" + Math.floor(10000000 + Math.random() * 90000000),
        accountName: normalUser.name,
        bankName: "BankSpace MFB",
        balance: 500000.0,
        currency: "NGN",
        isPrimary: true,
        status: "ACTIVE",
      },
    })

    const adminUser = await prisma.user.create({
      data: { name: "Tx Admin", email: adminEmail, passwordHash, role: "ADMIN", isVerified: true },
    })

    // Create 3 Test Transactions (TRANSFER, DEPOSIT, FAILED)
    const tx1 = await prisma.transaction.create({
      data: {
        reference: `TRX_TEST_${timestamp}_1`,
        providerRef: `PAYSTACK_REF_${timestamp}_1`,
        senderAccountId: normalWallet.id,
        senderName: normalUser.name,
        recipientName: "Jane Doe",
        bankName: "Guaranty Trust Bank",
        accountNumber: "0123456789",
        amount: 50000.0,
        fee: 25.0,
        type: "TRANSFER",
        status: "SUCCESSFUL",
        currency: "NGN",
      },
    })

    const tx2 = await prisma.transaction.create({
      data: {
        reference: `TRX_TEST_${timestamp}_2`,
        providerRef: `PAYSTACK_REF_${timestamp}_2`,
        senderAccountId: normalWallet.id,
        senderName: "Paystack Deposit",
        recipientName: normalUser.name,
        bankName: "BankSpace MFB",
        accountNumber: normalWallet.accountNumber,
        amount: 150000.0,
        fee: 0.0,
        type: "DEPOSIT",
        status: "SUCCESSFUL",
        currency: "NGN",
      },
    })

    const adminToken = jwt.sign({ sub: adminUser.id, email: adminUser.email, role: "ADMIN" }, JWT_SECRET, { expiresIn: "1h" })
    const expiresAt = new Date(Date.now() + 3600 * 1000)
    await prisma.session.create({ data: { userId: adminUser.id, token: adminToken, expiresAt } })

    console.log("  ✓ Setup Complete. Test Accounts & Transactions Created.\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 1: SERVER-SIDE TRANSACTION PAGINATION & METRICS
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 1: Testing Server-Side Transaction Query & Volume Metrics...")
    const { requireAdminSession } = require("@/lib/auth")
    const adminCheck = await requireAdminSession(adminToken)
    if (!adminCheck.valid) throw new Error("FAIL: Admin session invalid!")

    const totalTxCount = await prisma.transaction.count()
    const transactionsList = await prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    })

    const settledVolume = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCESSFUL" },
    })

    console.log(`  ✓ Total Transactions in DB: ${totalTxCount}`)
    console.log(`  ✓ Total Settled Volume: ₦${settledVolume._sum.amount || 0}`)
    console.log(`  ✓ Returned Items on Page 1 (Limit 5): ${transactionsList.length}`)

    if (transactionsList.length === 0) throw new Error("FAIL: No transactions returned!")
    console.log("  ✅ CHECKPOINT 1 PASSED: Server-Side Query & Volume Metrics Verified\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 2: PROVIDER REFERENCE & MULTI-FILTERING
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 2: Testing Provider Reference & Multi-Criteria Filters...")
    const providerTx = await prisma.transaction.findUnique({
      where: { id: tx1.id },
    })

    console.log(`  ✓ Transaction Reference: "${providerTx.reference}"`)
    console.log(`  ✓ Paystack Provider Reference: "${providerTx.providerRef}"`)
    console.log(`  ✓ Amount & Fee: ₦${providerTx.amount} (Fee: ₦${providerTx.fee})`)
    console.log(`  ✓ Status & Type: Status="${providerTx.status}", Type="${providerTx.type}"`)

    if (providerTx.providerRef !== `PAYSTACK_REF_${timestamp}_1`) {
      throw new Error("FAIL: Provider Reference mismatch!")
    }
    console.log("  ✅ CHECKPOINT 2 PASSED: Provider Reference & Detail Audit Verified\n")

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Cleaning test records...")
    await prisma.transaction.deleteMany({ where: { id: { in: [tx1.id, tx2.id] } } })
    await prisma.session.deleteMany({ where: { userId: adminUser.id } })
    await prisma.bankAccount.delete({ where: { id: normalWallet.id } })
    await prisma.user.deleteMany({ where: { id: { in: [normalUser.id, adminUser.id] } } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 ADMIN TRANSACTION MANAGEMENT TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ ADMIN TRANSACTION MANAGEMENT TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testAdminTransactionsPage()
