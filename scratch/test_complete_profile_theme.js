require("dotenv").config()
const fs = require("fs")

function testCompleteProfileTheme() {
  console.log("==================================================")
  console.log("   COMPLETE PROFILE DASHBOARD COLOR THEME AUDIT   ")
  console.log("==================================================\n")

  try {
    const pageFile = "src/app/complete-profile/page.tsx"
    if (!fs.existsSync(pageFile)) {
      throw new Error(`FAIL: Missing complete-profile page file: ${pageFile}`)
    }

    const content = fs.readFileSync(pageFile, "utf8")

    const hasDashboardBackdrop = content.includes("bg-[#f8fafc]") || content.includes("bg-slate-50")
    const hasBrandGradient = content.includes("from-[#4938f2]") && content.includes("to-[#622dff]")
    const hasTypographyGradient = content.includes("from-[#6757ff]") && content.includes("to-[#43a1ff]")
    const hasDashboardBorders = content.includes("border-slate-200/80")
    const hasDashboardCardGradients = content.includes("from-[#7257ff]") && content.includes("via-[#4335eb]")

    console.log(`  ✓ Light Fintech Backdrop (bg-[#f8fafc]): ${hasDashboardBackdrop}`)
    console.log(`  ✓ Dashboard Primary Button Gradient (from-[#4938f2] to-[#622dff]): ${hasBrandGradient}`)
    console.log(`  ✓ Dashboard Typography Gradient (from-[#6757ff] to-[#43a1ff]): ${hasTypographyGradient}`)
    console.log(`  ✓ Dashboard Card Border Styling (border-slate-200/80): ${hasDashboardBorders}`)
    console.log(`  ✓ Dashboard Card Hero Gradient (from-[#7257ff] via-[#4335eb]): ${hasDashboardCardGradients}`)

    if (!hasDashboardBackdrop || !hasBrandGradient || !hasTypographyGradient || !hasDashboardBorders || !hasDashboardCardGradients) {
      throw new Error("FAIL: Complete Profile Theme Refactor audit failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 COMPLETE PROFILE THEME ALIGNMENT VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ THEME AUDIT FAILED:", err)
    process.exit(1)
  }
}

testCompleteProfileTheme()
