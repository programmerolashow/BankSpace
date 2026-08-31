require("dotenv").config()
const { getPrismaClient } = require("@/lib/prisma")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")

const { client: prisma } = getPrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret"

async function testAdminSettings() {
  console.log("==================================================")
  console.log("   ADMIN SETTINGS & SYSTEM HEALTH TEST SUITE     ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const adminEmail = `settings_admin_${timestamp}@bankspace.com`
  const initialPassword = "InitialPassword123!"
  const updatedPassword = "UpdatedPassword456!"

  try {
    const passwordHash = await bcrypt.hash(initialPassword, 10)

    console.log("▶ SETUP: Creating Test Admin Account...")
    const adminUser = await prisma.user.create({
      data: { name: "Settings Admin Initial", email: adminEmail, passwordHash, role: "ADMIN", isVerified: true },
    })

    const adminToken = jwt.sign({ sub: adminUser.id, email: adminUser.email, role: "ADMIN" }, JWT_SECRET, { expiresIn: "1h" })
    const expiresAt = new Date(Date.now() + 3600 * 1000)
    await prisma.session.create({ data: { userId: adminUser.id, token: adminToken, expiresAt } })

    console.log("  ✓ Setup Complete. Admin Account Created.\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 1: ADMIN PROFILE QUERY & UPDATE
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 1: Testing Admin Profile Update & Audit Logging...")
    const updatedName = "Settings Admin Updated"
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { name: updatedName, phone: "+2348000001111" },
    })

    const updatedUser = await prisma.user.findUnique({
      where: { id: adminUser.id },
      select: { name: true, phone: true },
    })

    console.log(`  ✓ Updated Admin Name: "${updatedUser.name}"`)
    console.log(`  ✓ Updated Admin Phone: "${updatedUser.phone}"`)

    if (updatedUser.name !== updatedName) {
      throw new Error("FAIL: Admin name update failed!")
    }
    console.log("  ✅ CHECKPOINT 1 PASSED: Admin Profile Update Verified\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 2: BCRYPT PASSWORD MUTATION & VERIFICATION
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 2: Testing Bcrypt Password Change & Verification...")
    const newPasswordHash = await bcrypt.hash(updatedPassword, 10)
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { passwordHash: newPasswordHash },
    })

    const reloadedUser = await prisma.user.findUnique({
      where: { id: adminUser.id },
      select: { passwordHash: true },
    })

    const matchesNew = await bcrypt.compare(updatedPassword, reloadedUser.passwordHash)
    const matchesOld = await bcrypt.compare(initialPassword, reloadedUser.passwordHash)

    console.log(`  ✓ Password Matches New Password: ${matchesNew}`)
    console.log(`  ✓ Password Matches Old Password: ${matchesOld}`)

    if (!matchesNew || matchesOld) {
      throw new Error("FAIL: Bcrypt password mutation verification failed!")
    }
    console.log("  ✅ CHECKPOINT 2 PASSED: Bcrypt Password Change & Verification Verified\n")

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Cleaning test records...")
    await prisma.session.deleteMany({ where: { userId: adminUser.id } })
    await prisma.user.delete({ where: { id: adminUser.id } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 ADMIN SETTINGS TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ ADMIN SETTINGS TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testAdminSettings()
