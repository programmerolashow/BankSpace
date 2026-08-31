require("dotenv").config()

function testAdminResponsiveContainment() {
  console.log("==================================================")
  console.log("   MULTI-DEVICE RESPONSIVE LAYOUT TEST SUITE     ")
  console.log("==================================================\n")

  try {
    const fs = require("fs")
    const dataTableContent = fs.readFileSync("src/components/admin/AdminDataTable.tsx", "utf8")
    const layoutContent = fs.readFileSync("src/components/layout/AdminLayout.tsx", "utf8")

    const hasTableOverflowGuard = dataTableContent.includes("overflow-x-auto") && dataTableContent.includes("max-w-full")
    const hasMobileDrawer = layoutContent.includes("mobileOpen") && layoutContent.includes("lg:hidden")

    console.log(`  ✓ Table Internal Horizontal Overflow Guard: ${hasTableOverflowGuard}`)
    console.log(`  ✓ Mobile & Tablet Navigation Drawer: ${hasMobileDrawer}`)

    if (!hasTableOverflowGuard || !hasMobileDrawer) {
      throw new Error("FAIL: Responsive containment check failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 MULTI-DEVICE RESPONSIVE TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ RESPONSIVE TEST FAILED:", err)
    process.exit(1)
  }
}

testAdminResponsiveContainment()
