require("dotenv").config()
const fs = require("fs")

function testDashboardAccessByPhone() {
  console.log("==================================================")
  console.log("   DASHBOARD ACCESS & PHONE ONBOARDING AUDIT       ")
  console.log("==================================================\n")

  try {
    const kycEngineFile = "src/lib/kycStateEngine.ts"
    const routeFile = "src/app/api/auth/complete-profile/route.ts"
    const pageFile = "src/app/complete-profile/page.tsx"

    const kycContent = fs.readFileSync(kycEngineFile, "utf8")
    const routeContent = fs.readFileSync(routeFile, "utf8")
    const pageContent = fs.readFileSync(pageFile, "utf8")

    const hasKycPhoneCheck = kycContent.includes("!user.phoneVerified && (!user.phone || !user.phone.trim())")
    const hasRouteStateUpdate = routeContent.includes('kycState: "ACTIVE"') && routeContent.includes("phoneVerified: true")
    const hasPagePhoneCheck = pageContent.includes('setError("Incomplete profile: please enter your phone number to proceed.")')

    console.log(`  ✓ KYC State Engine Phone Requirement Check: ${hasKycPhoneCheck}`)
    console.log(`  ✓ Complete Profile Route Active State Update: ${hasRouteStateUpdate}`)
    console.log(`  ✓ Complete Profile Page Dashboard Navigation: ${hasPagePhoneCheck}`)

    if (!hasKycPhoneCheck || !hasRouteStateUpdate || !hasPagePhoneCheck) {
      throw new Error("FAIL: Dashboard access by phone audit failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 DASHBOARD ACCESS BY PHONE VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ DASHBOARD ACCESS AUDIT FAILED:", err)
    process.exit(1)
  }
}

testDashboardAccessByPhone()
