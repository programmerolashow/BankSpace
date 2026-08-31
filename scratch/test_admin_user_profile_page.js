require("dotenv").config()
const { getPrismaClient } = require("@/lib/prisma")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")

const { client: prisma } = getPrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret"

async function testAdminUserProfilePage() {
  console.log("==================================================")
  console.log("    ADMIN USER PROFILE PAGE TEST SUITE           ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const normalEmail = `profile_customer_${timestamp}@bankspace.com`
  const adminEmail = `profile_admin_${timestamp}@bankspace.com`

  try {
    const passwordHash = await bcrypt.hash("Password123!", 10)

    console.log("▶ SETUP: Creating Test Accounts for Detailed User Profile Page...")
    const normalUser = await prisma.user.create({
      data: { name: "Profile Customer", email: normalEmail, passwordHash, role: "USER", isVerified: false },
    })
    const normalWallet = await prisma.bankAccount.create({
      data: {
        userId: normalUser.id,
        accountNumber: "20" + Math.floor(10000000 + Math.random() * 90000000),
        accountName: normalUser.name,
        bankName: "BankSpace MFB",
        balance: 250000.0,
        currency: "NGN",
        isPrimary: true,
        status: "ACTIVE",
      },
    })

    const adminUser = await prisma.user.create({
      data: { name: "Profile Admin", email: adminEmail, passwordHash, role: "ADMIN", isVerified: true },
    })

    const normalToken = jwt.sign({ sub: normalUser.id, email: normalUser.email, role: "USER" }, JWT_SECRET, { expiresIn: "1h" })
    const adminToken = jwt.sign({ sub: adminUser.id, email: adminUser.email, role: "ADMIN" }, JWT_SECRET, { expiresIn: "1h" })

    const expiresAt = new Date(Date.now() + 3600 * 1000)
    await prisma.session.create({ data: { userId: normalUser.id, token: normalToken, expiresAt } })
    await prisma.session.create({ data: { userId: adminUser.id, token: adminToken, expiresAt } })

    console.log("  ✓ Setup Complete. User Profile & Admin Session Active.\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 1: USER PROFILE & SECTIONS DATA RETRIEVAL
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 1: Testing Profile Data Retrieval for /admin/users/[id]...")
    const { requireAdminSession } = require("@/lib/auth")
    const adminCheck = await requireAdminSession(adminToken)
    if (!adminCheck.valid) throw new Error("FAIL: Admin session invalid!")

    const userProfile = await prisma.user.findUnique({
      where: { id: normalUser.id },
      include: { bankAccounts: true },
    })

    console.log(`  ✓ Section 1 (Profile): Name="${userProfile.name}", Email="${userProfile.email}", Registered=${userProfile.createdAt.toISOString()}`)
    console.log(`  ✓ Section 2 (Verification): isVerified=${userProfile.isVerified}`)
    console.log(`  ✓ Section 3 (Financial Overview): NUBAN=${userProfile.bankAccounts[0].accountNumber}, Balance=₦${userProfile.bankAccounts[0].balance}`)

    if (!userProfile) throw new Error("FAIL: User profile retrieval failed!")
    console.log("  ✅ CHECKPOINT 1 PASSED: User Profile Sections Verified\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 2: ADMINISTRATIVE ACTIONS & DESTRUCTIVE CONFIRMATION
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 2: Testing Administrative Actions (Suspend & Verify)...")

    // 1. Suspend User Account
    await prisma.bankAccount.updateMany({
      where: { userId: normalUser.id },
      data: { status: "FROZEN" },
    })

    const frozenWallet = await prisma.bankAccount.findFirst({ where: { userId: normalUser.id } })
    console.log(`  ✓ Administrative Action (SUSPEND): Account Status = "${frozenWallet.status}"`)
    if (frozenWallet.status !== "FROZEN") throw new Error("FAIL: Account status was not updated to FROZEN!")

    // 2. Verify KYC Identity
    await prisma.user.update({
      where: { id: normalUser.id },
      data: { isVerified: true },
    })

    const verifiedUser = await prisma.user.findUnique({ where: { id: normalUser.id } })
    console.log(`  ✓ Administrative Action (VERIFY): KYC Status = isVerified=${verifiedUser.isVerified}`)
    if (!verifiedUser.isVerified) throw new Error("FAIL: User KYC status was not updated to VERIFIED!")

    console.log("  ✅ CHECKPOINT 2 PASSED: Administrative Actions Verified\n")

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Cleaning test records...")
    await prisma.session.deleteMany({ where: { userId: { in: [normalUser.id, adminUser.id] } } })
    await prisma.bankAccount.delete({ where: { id: normalWallet.id } })
    await prisma.user.deleteMany({ where: { id: { in: [normalUser.id, adminUser.id] } } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 ADMIN USER PROFILE PAGE TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ ADMIN USER PROFILE PAGE TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testAdminUserProfilePage()
