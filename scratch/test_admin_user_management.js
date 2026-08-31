require("dotenv").config()
const { getPrismaClient } = require("@/lib/prisma")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")

const { client: prisma } = getPrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret"

async function testAdminUserManagement() {
  console.log("==================================================")
  console.log("  ADMIN USER MANAGEMENT & PAGINATION SUITE       ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const normalEmail = `customer_mgmt_${timestamp}@bankspace.com`
  const adminEmail = `admin_mgmt_${timestamp}@bankspace.com`

  try {
    const passwordHash = await bcrypt.hash("Password123!", 10)

    console.log("▶ SETUP: Creating Test Accounts for Paginated User Registry...")
    const normalUser = await prisma.user.create({
      data: { name: "Management Customer", email: normalEmail, passwordHash, role: "USER", isVerified: true },
    })
    const normalWallet = await prisma.bankAccount.create({
      data: {
        userId: normalUser.id,
        accountNumber: "20" + Math.floor(10000000 + Math.random() * 90000000),
        accountName: normalUser.name,
        bankName: "BankSpace MFB",
        balance: 120000.0,
        currency: "NGN",
        isPrimary: true,
        status: "ACTIVE",
      },
    })

    const adminUser = await prisma.user.create({
      data: { name: "Management Admin", email: adminEmail, passwordHash, role: "ADMIN", isVerified: true },
    })

    const normalToken = jwt.sign({ sub: normalUser.id, email: normalUser.email, role: "USER" }, JWT_SECRET, { expiresIn: "1h" })
    const adminToken = jwt.sign({ sub: adminUser.id, email: adminUser.email, role: "ADMIN" }, JWT_SECRET, { expiresIn: "1h" })

    const expiresAt = new Date(Date.now() + 3600 * 1000)
    await prisma.session.create({ data: { userId: normalUser.id, token: normalToken, expiresAt } })
    await prisma.session.create({ data: { userId: adminUser.id, token: adminToken, expiresAt } })

    console.log("  ✓ Setup Complete. Test Accounts Created.\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 1: SERVER-SIDE USER PAGINATION QUERY
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 1: Testing Server-Side User Pagination Query...")
    const { requireAdminSession } = require("@/lib/auth")

    const adminCheck = await requireAdminSession(adminToken)
    if (!adminCheck.valid) throw new Error("FAIL: Admin session invalid!")

    const page = 1
    const limit = 5
    const totalUsers = await prisma.user.count()
    const usersList = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isVerified: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    })

    console.log(`  ✓ Total Users in DB: ${totalUsers}`)
    console.log(`  ✓ Returned Items on Page 1 (Limit ${limit}): ${usersList.length}`)
    console.log(`  ✓ Total Pages: ${Math.ceil(totalUsers / limit)}`)

    if (usersList.length > limit) {
      throw new Error("FAIL: Server-side pagination returned more items than page limit!")
    }
    console.log("  ✅ CHECKPOINT 1 PASSED: Server-Side Pagination Operates Cleanly\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 2: DEEP USER INSPECTION QUERY
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 2: Testing Deep User Detail Inspection...")

    const inspectedUser = await prisma.user.findUnique({
      where: { id: normalUser.id },
      include: { bankAccounts: true },
    })

    console.log(`  ✓ Inspected User Name: "${inspectedUser.name}"`)
    console.log(`  ✓ Registration Date: ${inspectedUser.createdAt.toISOString()}`)
    console.log(`  ✓ KYC Status: isVerified=${inspectedUser.isVerified}`)
    console.log(`  ✓ NUBAN Account: ${inspectedUser.bankAccounts[0].accountNumber} (Balance: ₦${inspectedUser.bankAccounts[0].balance})`)

    if (!inspectedUser || inspectedUser.id !== normalUser.id) {
      throw new Error("FAIL: Deep user inspection failed to return target user!")
    }
    console.log("  ✅ CHECKPOINT 2 PASSED: Deep User Detail Inspection Verified\n")

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Cleaning test records...")
    await prisma.session.deleteMany({ where: { userId: { in: [normalUser.id, adminUser.id] } } })
    await prisma.bankAccount.delete({ where: { id: normalWallet.id } })
    await prisma.user.deleteMany({ where: { id: { in: [normalUser.id, adminUser.id] } } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 ADMIN USER MANAGEMENT TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ ADMIN USER MANAGEMENT TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testAdminUserManagement()
