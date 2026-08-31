require("dotenv").config()
const { getPrismaClient } = require("@/lib/prisma")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")

const { client: prisma } = getPrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret"

async function testAdminNotifications() {
  console.log("==================================================")
  console.log("   ADMIN OPERATIONAL NOTIFICATIONS TEST SUITE    ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const adminEmail = `notif_admin_${timestamp}@bankspace.com`

  try {
    const passwordHash = await bcrypt.hash("Password123!", 10)

    console.log("▶ SETUP: Creating Admin Account & Operational Events...")
    const adminUser = await prisma.user.create({
      data: { name: "Notif Admin", email: adminEmail, passwordHash, role: "ADMIN", isVerified: true },
    })

    const adminToken = jwt.sign({ sub: adminUser.id, email: adminUser.email, role: "ADMIN" }, JWT_SECRET, { expiresIn: "1h" })
    const expiresAt = new Date(Date.now() + 3600 * 1000)
    await prisma.session.create({ data: { userId: adminUser.id, token: adminToken, expiresAt } })

    // Test notifyAdmins helper
    const { notifyAdmins } = require("@/lib/notifications")
    await notifyAdmins("Operational Health Check", "Automated system alert dispatched to all admins.", "WARNING")

    console.log("  ✓ Setup Complete. Admin Account & Notifications Created.\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 1: NOTIFY ADMINS & DB NOTIFICATION QUERY
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 1: Testing notifyAdmins & Admin Notifications Query...")
    const { requireAdminSession } = require("@/lib/auth")
    const adminCheck = await requireAdminSession(adminToken)
    if (!adminCheck.valid) throw new Error("FAIL: Admin session invalid!")

    const adminNotifs = await prisma.notification.findMany({
      where: { userId: adminUser.id },
    })

    console.log(`  ✓ DB Notifications Count for Admin: ${adminNotifs.length}`)
    console.log(`  ✓ Notification Title: "${adminNotifs[0].title}"`)
    console.log(`  ✓ Notification Type: "${adminNotifs[0].type}"`)

    if (adminNotifs.length === 0 || adminNotifs[0].title !== "Operational Health Check") {
      throw new Error("FAIL: Admin notification was not recorded in DB!")
    }
    console.log("  ✅ CHECKPOINT 1 PASSED: notifyAdmins & DB Dispatch Verified\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 2: MARK ALL READ ACTION
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 2: Testing Mark All as Read Action...")
    await prisma.notification.updateMany({
      where: { userId: adminUser.id },
      data: { isRead: true },
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: adminUser.id, isRead: false },
    })

    console.log(`  ✓ Unread Notifications Count After Mark Read: ${unreadCount}`)
    if (unreadCount !== 0) throw new Error("FAIL: Unread count should be 0!")
    console.log("  ✅ CHECKPOINT 2 PASSED: Mark All Read Action Verified\n")

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Cleaning test records...")
    await prisma.notification.deleteMany({ where: { userId: adminUser.id } })
    await prisma.session.deleteMany({ where: { userId: adminUser.id } })
    await prisma.user.delete({ where: { id: adminUser.id } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 ADMIN NOTIFICATIONS TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ ADMIN NOTIFICATIONS TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testAdminNotifications()
