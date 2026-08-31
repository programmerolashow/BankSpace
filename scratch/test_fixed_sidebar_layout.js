require("dotenv").config()

function testFixedSidebarLayoutArchitecture() {
  console.log("==================================================")
  console.log("   FIXED SIDEBAR & VIEWPORT LAYOUT TEST SUITE     ")
  console.log("==================================================\n")

  try {
    const fs = require("fs")
    const content = fs.readFileSync("src/components/layout/AdminLayout.tsx", "utf8")

    const hasOuterShellFixed = content.includes("h-screen max-h-screen overflow-hidden")
    const hasHeaderFixed = content.includes("h-16 shrink-0")
    const hasShellBodyBounded = content.includes("h-[calc(100vh-4rem)]")
    const hasSidebarStationary = content.includes("shrink-0 h-full overflow-hidden")
    const hasMainContentScrollable = content.includes("flex-1 overflow-y-auto") && content.includes("h-full")
    const hasMobileDrawerPreserved = content.includes("mobileOpen") && content.includes("lg:hidden")

    console.log(`  ✓ Outer Shell Fixed Height (h-screen overflow-hidden): ${hasOuterShellFixed}`)
    console.log(`  ✓ Top Header Fixed Height (h-16 shrink-0): ${hasHeaderFixed}`)
    console.log(`  ✓ Bounded Shell Body Height (h-[calc(100vh-4rem)]): ${hasShellBodyBounded}`)
    console.log(`  ✓ Desktop Sidebar Stationary (shrink-0 h-full overflow-hidden): ${hasSidebarStationary}`)
    console.log(`  ✓ Main Content Independently Scrollable (flex-1 overflow-y-auto h-full): ${hasMainContentScrollable}`)
    console.log(`  ✓ Mobile Drawer Preserved for < lg screens: ${hasMobileDrawerPreserved}`)

    if (
      !hasOuterShellFixed ||
      !hasHeaderFixed ||
      !hasShellBodyBounded ||
      !hasSidebarStationary ||
      !hasMainContentScrollable ||
      !hasMobileDrawerPreserved
    ) {
      throw new Error("FAIL: Fixed sidebar layout architecture validation failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 FIXED SIDEBAR LAYOUT TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ FIXED SIDEBAR LAYOUT TEST FAILED:", err)
    process.exit(1)
  }
}

testFixedSidebarLayoutArchitecture()
