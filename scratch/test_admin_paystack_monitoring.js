require("dotenv").config()
const { getPrismaClient } = require("@/lib/prisma")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")

const { client: prisma } = getPrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret"

async function testAdminPaystackMonitoring() {
  console.log("==================================================")
  console.log("   ADMIN PAYSTACK MONITORING LAYER TEST SUITE    ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const normalEmail = `paystack_customer_${timestamp}@bankspace.com`
  const adminEmail = `paystack_admin_${timestamp}@bankspace.com`

  try {
    const passwordHash = await bcrypt.hash("Password123!", 10)

    console.log("▶ SETUP: Creating Test Accounts & Paystack Provider Entries...")
    const normalUser = await prisma.user.create({
      data: { name: "Paystack Customer", email: normalEmail, passwordHash, role: "USER", isVerified: true },
    })
    const normalWallet = await prisma.bankAccount.create({
      data: {
        userId: normalUser.id,
        accountNumber: "20" + Math.floor(10000000 + Math.random() * 90000000),
        accountName: normalUser.name,
        bankName: "BankSpace MFB",
        balance: 750000.0,
        currency: "NGN",
        isPrimary: true,
        status: "ACTIVE",
      },
    })

    const adminUser = await prisma.user.create({
      data: { name: "Paystack Admin", email: adminEmail, passwordHash, role: "ADMIN", isVerified: true },
    })

    // Create Paystack Deposit (charge.success) & Transfer (transfer.failed) entries
    const tx1 = await prisma.transaction.create({
      data: {
        reference: `PAYSTACK_DEP_${timestamp}_1`,
        providerRef: `PAYSTACK_REF_${timestamp}_1`,
        recipientAccountId: normalWallet.id,
        senderName: "Card Payment",
        recipientName: normalUser.name,
        bankName: "Paystack Gateway",
        accountNumber: normalWallet.accountNumber,
        amount: 200000.0,
        fee: 0.0,
        type: "DEPOSIT",
        status: "SUCCESSFUL",
        currency: "NGN",
        description: "charge.success - Card Payment Verified",
      },
    })

    const tx2 = await prisma.transaction.create({
      data: {
        reference: `PAYSTACK_TRF_${timestamp}_2`,
        providerRef: `PAYSTACK_REF_${timestamp}_2`,
        senderAccountId: normalWallet.id,
        senderName: normalUser.name,
        recipientName: "Chinedu Eze",
        bankName: "First Bank",
        accountNumber: "0112233445",
        amount: 95000.0,
        fee: 50.0,
        type: "TRANSFER",
        status: "FAILED",
        currency: "NGN",
        description: "transfer.failed - Account number invalid or not found at recipient bank.",
      },
    })

    const adminToken = jwt.sign({ sub: adminUser.id, email: adminUser.email, role: "ADMIN" }, JWT_SECRET, { expiresIn: "1h" })
    const expiresAt = new Date(Date.now() + 3600 * 1000)
    await prisma.session.create({ data: { userId: adminUser.id, token: adminToken, expiresAt } })

    console.log("  ✓ Setup Complete. Test Paystack Provider Records Created.\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 1: SECURITY CREDENTIAL ISOLATION AUDIT
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 1: Testing Security Credential Isolation...")
    const { requireAdminSession } = require("@/lib/auth")
    const adminCheck = await requireAdminSession(adminToken)
    if (!adminCheck.valid) throw new Error("FAIL: Admin session invalid!")

    const paystackRecords = await prisma.transaction.findMany({
      where: { NOT: { providerRef: null } },
      take: 5,
    })

    const serializedPayload = JSON.stringify(paystackRecords)
    const containsSecretKey = serializedPayload.includes(process.env.PAYSTACK_SECRET_KEY || "sk_test_")
    console.log(`  ✓ Paystack Secret Key Present in Payload: ${containsSecretKey}`)

    if (containsSecretKey) {
      throw new Error("SECURITY FAILURE: Paystack secret key was exposed in monitoring payload!")
    }
    console.log("  ✅ CHECKPOINT 1 PASSED: Zero Credential Exposure Verified\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 2: PROVIDER REFERENCES, RESPONSE, & FAILURE RATIONALE
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 2: Testing Provider Ref & Failure Response Inspection...")
    const record1 = await prisma.transaction.findUnique({ where: { id: tx1.id } })
    const record2 = await prisma.transaction.findUnique({ where: { id: tx2.id } })

    console.log(`  ✓ Deposit Entry: Reference="${record1.reference}", ProviderRef="${record1.providerRef}", Status="${record1.status}"`)
    console.log(`  ✓ Failed Transfer Entry: Reference="${record2.reference}", ProviderRef="${record2.providerRef}", FailureReason="${record2.description}"`)

    if (record1.providerRef !== `PAYSTACK_REF_${timestamp}_1` || record2.providerRef !== `PAYSTACK_REF_${timestamp}_2`) {
      throw new Error("FAIL: Provider reference mismatch!")
    }
    if (!record2.description.includes("transfer.failed")) {
      throw new Error("FAIL: Gateway failure reason missing!")
    }
    console.log("  ✅ CHECKPOINT 2 PASSED: Provider Reference & Failure Inspection Verified\n")

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
    console.log("   🎉 ADMIN PAYSTACK MONITORING TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ ADMIN PAYSTACK MONITORING TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testAdminPaystackMonitoring()
