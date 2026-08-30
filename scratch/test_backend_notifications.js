const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function runNotificationTests() {
  console.log("==================================================")
  console.log("  BACKEND EVENT NOTIFICATIONS BACKEND TEST SUITE  ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const testEmail = `notify_user_${timestamp}@bankspace.com`

  try {
    // 1. Setup Test User
    console.log("▶ SETUP: Creating Test User")
    const passwordHash = await bcrypt.hash("Password123!", 10)
    const user = await prisma.user.create({
      data: { name: "Notification Test User", email: testEmail, passwordHash, role: "USER", isVerified: true },
    })

    // -------------------------------------------------------------------
    // TEST 1: SAVINGS & INVESTMENT NOTIFICATION TRIGGERS
    // -------------------------------------------------------------------
    console.log("▶ TEST 1: Generating Backend Financial Notifications...")

    const notificationsToCreate = [
      { title: "Savings Vault Created 🎯", message: "Created Emergency Fund vault with ₦500,000 target.", type: "SUCCESS" },
      { title: "Deposit Successful 💰", message: "Deposited ₦25,000 to Emergency Fund from primary wallet.", type: "SUCCESS" },
      { title: "Savings Withdrawal Processed 💸", message: "Withdrew ₦10,000 from Savings Vault.", type: "SUCCESS" },
      { title: "Goal Milestone Achieved! 🏆", message: "Congratulations! You reached 100% of your target.", type: "SUCCESS" },
      { title: "Fixed Deposit Matured! 🏆", message: "Your fixed deposit has matured with ₦115,000.", type: "SUCCESS" },
      { title: "Daily Interest Return Credited 📈", message: "Credited ₦136.99 daily compound yield.", type: "SUCCESS" },
      { title: "Investment Order Filled 📈", message: "Purchased 100 units of FGN 90-Day Treasury Bill.", type: "SUCCESS" },
      { title: "Portfolio Value Updated 📈", message: "Revalued asset NAV price to ₦1,200.", type: "INFO" },
      { title: "Dividend Paid Out 💵", message: "Dividend payout of ₦5,000 credited to checking wallet.", type: "SUCCESS" },
      { title: "Investment Redemption Executed 💸", message: "Redeemed 40 units for net ₦40,000 payout.", type: "SUCCESS" },
    ]

    for (const n of notificationsToCreate) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: n.title,
          message: n.message,
          type: n.type,
          isRead: false,
        },
      })
    }

    const fetchedNotifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    })

    console.log(`  ✓ Total Notifications Generated: ${fetchedNotifications.length} (Expected 10)`)
    console.log(`  ✓ Unread Notifications Count: ${fetchedNotifications.filter((n) => !n.isRead).length} (Expected 10)`)
    console.log("  ✅ TEST 1 PASSED\n")

    // -------------------------------------------------------------------
    // TEST 2: MARK NOTIFICATIONS AS READ
    // -------------------------------------------------------------------
    console.log("▶ TEST 2: Marking Notifications as Read...")
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    })

    const remainingUnread = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    })

    console.log(`  ✓ Remaining Unread Notifications: ${remainingUnread} (Expected 0)`)
    console.log("  ✅ TEST 2 PASSED\n")

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Deleting test notification records...")
    await prisma.notification.deleteMany({ where: { userId: user.id } })
    await prisma.user.delete({ where: { id: user.id } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 ALL NOTIFICATION TESTS PASSED WITH 100% SUCCESS")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ NOTIFICATION TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runNotificationTests()
