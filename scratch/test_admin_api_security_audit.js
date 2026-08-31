require("dotenv").config()
const { getPrismaClient } = require("@/lib/prisma")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")

const { client: prisma } = getPrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret"

async function testAdminApiSecurityAudit() {
  console.log("==================================================")
  console.log("   ADMIN API SECURITY & AUTHORIZATION AUDIT TEST  ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const normalEmail = `customer_audit_${timestamp}@bankspace.com`
  const adminEmail = `admin_audit_${timestamp}@bankspace.com`

  try {
    const passwordHash = await bcrypt.hash("Password123!", 10)

    console.log("▶ SETUP: Creating Normal Customer & Admin Accounts...")
    const normalUser = await prisma.user.create({
      data: { name: "Audit Customer", email: normalEmail, passwordHash, role: "USER", isVerified: true },
    })

    const adminUser = await prisma.user.create({
      data: { name: "Audit Admin", email: adminEmail, passwordHash, role: "ADMIN", isVerified: true },
    })

    const normalToken = jwt.sign({ sub: normalUser.id, email: normalUser.email, role: "USER" }, JWT_SECRET, { expiresIn: "1h" })
    const adminToken = jwt.sign({ sub: adminUser.id, email: adminUser.email, role: "ADMIN" }, JWT_SECRET, { expiresIn: "1h" })

    const expiresAt = new Date(Date.now() + 3600 * 1000)
    await prisma.session.create({ data: { userId: normalUser.id, token: normalToken, expiresAt } })
    await prisma.session.create({ data: { userId: adminUser.id, token: adminToken, expiresAt } })

    console.log("  ✓ Setup Complete. Customer & Admin Sessions Active.\n")

    const { requireAdminSession } = require("@/lib/auth")

    // -------------------------------------------------------------------
    // CHECKPOINT 1: UNAUTHENTICATED ACCESS GUARD (HTTP 401)
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 1: Testing Unauthenticated Access Guard...")
    const unauthResult = await requireAdminSession("")
    console.log(`  ✓ Empty Token Response: Valid=${unauthResult.valid}, Status=${unauthResult.status}, Error="${unauthResult.error}"`)

    if (unauthResult.valid || unauthResult.status !== 401) {
      throw new Error("FAIL: Unauthenticated request was not blocked with 401!")
    }
    console.log("  ✅ CHECKPOINT 1 PASSED: Unauthenticated Access Guard Verified (HTTP 401)\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 2: NON-ADMIN AUTHORIZATION GUARD (HTTP 403 FORBIDDEN)
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 2: Testing Non-Admin Customer Authorization Guard...")
    const forbiddenResult = await requireAdminSession(normalToken)
    console.log(`  ✓ Normal Customer Token Response: Valid=${forbiddenResult.valid}, Status=${forbiddenResult.status}, Error="${forbiddenResult.error}"`)

    if (forbiddenResult.valid || forbiddenResult.status !== 403) {
      throw new Error("FAIL: Non-admin customer was not blocked with 403 Forbidden!")
    }
    console.log("  ✅ CHECKPOINT 2 PASSED: Non-Admin Authorization Guard Verified (HTTP 403)\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 3: ADMIN AUTHORIZATION SUCCESS (HTTP 200)
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 3: Testing Verified Admin Authorization...")
    const adminResult = await requireAdminSession(adminToken)
    console.log(`  ✓ Admin Token Response: Valid=${adminResult.valid}, Status=${adminResult.status}, UserRole="${adminResult.user?.role}"`)

    if (!adminResult.valid || adminResult.status !== 200 || adminResult.user?.role !== "ADMIN") {
      throw new Error("FAIL: Verified admin session was rejected!")
    }
    console.log("  ✅ CHECKPOINT 3 PASSED: Verified Admin Authorization Verified\n")

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Cleaning test records...")
    await prisma.session.deleteMany({ where: { userId: { in: [normalUser.id, adminUser.id] } } })
    await prisma.user.deleteMany({ where: { id: { in: [normalUser.id, adminUser.id] } } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 ADMIN API SECURITY AUDIT PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ ADMIN API SECURITY AUDIT FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testAdminApiSecurityAudit()
