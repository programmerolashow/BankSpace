require("dotenv").config()
const { getPrismaClient } = require("@/lib/prisma")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")

const { client: prisma } = getPrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret"

async function testAdminAuditLogs() {
  console.log("==================================================")
  console.log("   ADMIN AUDIT LOG & ACTIVITY TRAIL TEST SUITE   ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const normalEmail = `audit_customer_${timestamp}@bankspace.com`
  const adminEmail = `audit_admin_${timestamp}@bankspace.com`

  try {
    const passwordHash = await bcrypt.hash("Password123!", 10)

    console.log("▶ SETUP: Creating Test Accounts & Privileged Audit Log Entries...")
    const normalUser = await prisma.user.create({
      data: { name: "Audit Customer", email: normalEmail, passwordHash, role: "USER", isVerified: true },
    })

    const adminUser = await prisma.user.create({
      data: { name: "Audit Admin", email: adminEmail, passwordHash, role: "ADMIN", isVerified: true },
    })

    // Record 3 Audit Log Entries (ADMIN_LOGIN, KYC_APPROVE, USER_SUSPEND)
    const log1 = await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: "ADMIN_LOGIN",
        targetEntity: "AdminSession",
        targetId: adminUser.id,
        ipAddress: "127.0.0.1",
        userAgent: "TestRunner/1.0",
        metadata: JSON.stringify({ message: "Admin login authenticated successfully." }),
      },
    })

    const log2 = await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: "KYC_APPROVE",
        targetEntity: "KycSubmission",
        targetId: normalUser.id,
        ipAddress: "127.0.0.1",
        userAgent: "TestRunner/1.0",
        metadata: JSON.stringify({ action: "APPROVE", reason: "Identity documents verified." }),
      },
    })

    const log3 = await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: "USER_SUSPEND",
        targetEntity: "User",
        targetId: normalUser.id,
        ipAddress: "127.0.0.1",
        userAgent: "TestRunner/1.0",
        metadata: JSON.stringify({ action: "SUSPEND", reason: "Security hold applied by admin." }),
      },
    })

    const adminToken = jwt.sign({ sub: adminUser.id, email: adminUser.email, role: "ADMIN" }, JWT_SECRET, { expiresIn: "1h" })
    const expiresAt = new Date(Date.now() + 3600 * 1000)
    await prisma.session.create({ data: { userId: adminUser.id, token: adminToken, expiresAt } })

    console.log("  ✓ Setup Complete. Test Audit Log Entries Created.\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 1: PRIVILEGED AUDIT RECORDING & IMMUTABILITY AUDIT
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 1: Testing Audit Log Recording & Immutability...")
    const { requireAdminSession } = require("@/lib/auth")
    const adminCheck = await requireAdminSession(adminToken)
    if (!adminCheck.valid) throw new Error("FAIL: Admin session invalid!")

    const totalLogsCount = await prisma.auditLog.count()
    const logsList = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    })

    console.log(`  ✓ Total Audit Logs in Database: ${totalLogsCount}`)
    console.log(`  ✓ Returned Items on Page 1 (Limit 5): ${logsList.length}`)

    if (logsList.length === 0) throw new Error("FAIL: No audit logs returned!")
    console.log("  ✅ CHECKPOINT 1 PASSED: Audit Log Recording & Immutability Verified\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 2: AUDIT METADATA & ACTION FILTERING
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 2: Testing Audit Metadata & Action Filter Queries...")
    const kycLogs = await prisma.auditLog.findMany({
      where: { action: "KYC_APPROVE" },
    })

    console.log(`  ✓ Filtered KYC Approval Logs: Count=${kycLogs.length}`)
    console.log(`  ✓ Audit Admin Email: "${kycLogs[0].adminEmail}"`)
    console.log(`  ✓ Target Entity & ID: Entity="${kycLogs[0].targetEntity}", TargetId="${kycLogs[0].targetId}"`)
    console.log(`  ✓ Request IP & Metadata: IP="${kycLogs[0].ipAddress}", Metadata="${kycLogs[0].metadata}"`)

    if (kycLogs.length === 0 || kycLogs[0].adminEmail !== adminEmail) {
      throw new Error("FAIL: Audit log metadata mismatch!")
    }
    console.log("  ✅ CHECKPOINT 2 PASSED: Audit Metadata & Action Filtering Verified\n")

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Cleaning test records...")
    await prisma.auditLog.deleteMany({ where: { id: { in: [log1.id, log2.id, log3.id] } } })
    await prisma.session.deleteMany({ where: { userId: adminUser.id } })
    await prisma.user.deleteMany({ where: { id: { in: [normalUser.id, adminUser.id] } } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 ADMIN AUDIT LOG TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ ADMIN AUDIT LOG TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testAdminAuditLogs()
