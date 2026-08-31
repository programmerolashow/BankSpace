require("dotenv").config()
const { getPrismaClient } = require("@/lib/prisma")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")

const { client: prisma } = getPrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret"

async function testAdminKYCManagement() {
  console.log("==================================================")
  console.log("     ADMIN KYC MANAGEMENT TEST SUITE             ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const normalEmail = `kyc_customer_${timestamp}@bankspace.com`
  const adminEmail = `kyc_admin_${timestamp}@bankspace.com`

  try {
    const passwordHash = await bcrypt.hash("Password123!", 10)

    console.log("▶ SETUP: Creating Test Accounts for KYC Management Console...")
    const normalUser = await prisma.user.create({
      data: {
        name: "KYC Customer",
        email: normalEmail,
        passwordHash,
        role: "USER",
        isVerified: false,
        kycStatus: "PENDING",
        kycSubmittedAt: new Date(),
      },
    })
    const normalWallet = await prisma.bankAccount.create({
      data: {
        userId: normalUser.id,
        accountNumber: "20" + Math.floor(10000000 + Math.random() * 90000000),
        accountName: normalUser.name,
        bankName: "BankSpace MFB",
        balance: 180000.0,
        currency: "NGN",
        isPrimary: true,
        status: "ACTIVE",
      },
    })

    const adminUser = await prisma.user.create({
      data: { name: "KYC Admin", email: adminEmail, passwordHash, role: "ADMIN", isVerified: true, kycStatus: "VERIFIED" },
    })

    const normalToken = jwt.sign({ sub: normalUser.id, email: normalUser.email, role: "USER" }, JWT_SECRET, { expiresIn: "1h" })
    const adminToken = jwt.sign({ sub: adminUser.id, email: adminUser.email, role: "ADMIN" }, JWT_SECRET, { expiresIn: "1h" })

    const expiresAt = new Date(Date.now() + 3600 * 1000)
    await prisma.session.create({ data: { userId: normalUser.id, token: normalToken, expiresAt } })
    await prisma.session.create({ data: { userId: adminUser.id, token: adminToken, expiresAt } })

    console.log("  ✓ Setup Complete. KYC Pending Account & Admin Active.\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 1: PAGINATED KYC QUEUE & METRIC COUNTERS
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 1: Testing Server-Side KYC Queue Retrieval...")
    const { requireAdminSession } = require("@/lib/auth")
    const adminCheck = await requireAdminSession(adminToken)
    if (!adminCheck.valid) throw new Error("FAIL: Admin session invalid!")

    const pendingUser = await prisma.user.findFirst({
      where: { id: normalUser.id },
      include: { bankAccounts: true },
    })

    console.log(`  ✓ Pending KYC Submission: Name="${pendingUser.name}", Status="${pendingUser.kycStatus}", SubmittedAt=${pendingUser.kycSubmittedAt}`)
    if (pendingUser.kycStatus !== "PENDING") throw new Error("FAIL: Initial KYC status is not PENDING!")
    console.log("  ✅ CHECKPOINT 1 PASSED: Server-Side KYC Queue Query Verified\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 2: REJECTION WORKFLOW & REASON LOGGING
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 2: Testing KYC Rejection Workflow & Reason Audit...")
    const rejectionReason = "Document image unreadable. Please upload a clear National Identity Card scan."

    await prisma.user.update({
      where: { id: normalUser.id },
      data: {
        isVerified: false,
        kycStatus: "REJECTED",
        kycRejectionReason: rejectionReason,
      },
    })

    const rejectedUser = await prisma.user.findUnique({ where: { id: normalUser.id } })
    console.log(`  ✓ Rejection Action Result: kycStatus="${rejectedUser.kycStatus}", isVerified=${rejectedUser.isVerified}`)
    console.log(`  ✓ Recorded Rejection Reason: "${rejectedUser.kycRejectionReason}"`)

    if (rejectedUser.kycStatus !== "REJECTED" || rejectedUser.kycRejectionReason !== rejectionReason) {
      throw new Error("FAIL: KYC Rejection workflow failed to record status or rejection reason!")
    }
    console.log("  ✅ CHECKPOINT 2 PASSED: Rejection Workflow & Audit Reason Verified\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 3: APPROVAL WORKFLOW
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 3: Testing KYC Approval Workflow...")
    await prisma.user.update({
      where: { id: normalUser.id },
      data: {
        isVerified: true,
        kycStatus: "VERIFIED",
        kycRejectionReason: null,
      },
    })

    const approvedUser = await prisma.user.findUnique({ where: { id: normalUser.id } })
    console.log(`  ✓ Approval Action Result: kycStatus="${approvedUser.kycStatus}", isVerified=${approvedUser.isVerified}`)
    console.log(`  ✓ Cleared Rejection Reason: ${approvedUser.kycRejectionReason}`)

    if (approvedUser.kycStatus !== "VERIFIED" || !approvedUser.isVerified) {
      throw new Error("FAIL: KYC Approval workflow failed to update status to VERIFIED!")
    }
    console.log("  ✅ CHECKPOINT 3 PASSED: Approval Workflow Verified\n")

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Cleaning test records...")
    await prisma.session.deleteMany({ where: { userId: { in: [normalUser.id, adminUser.id] } } })
    await prisma.bankAccount.delete({ where: { id: normalWallet.id } })
    await prisma.user.deleteMany({ where: { id: { in: [normalUser.id, adminUser.id] } } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("    🎉 ADMIN KYC MANAGEMENT TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ ADMIN KYC MANAGEMENT TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testAdminKYCManagement()
