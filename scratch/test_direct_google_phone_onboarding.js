require("dotenv").config()
const fs = require("fs")

function testDirectGooglePhoneOnboarding() {
  console.log("==================================================")
  console.log("   DIRECT GOOGLE PHONE & SMS BYPASS AUDIT         ")
  console.log("==================================================\n")

  try {
    const googleRouteFile = "src/app/api/auth/google/route.ts"
    const callbackRouteFile = "src/app/api/auth/callback/google/route.ts"
    const authLibFile = "src/lib/auth.ts"
    const completeProfilePage = "src/app/complete-profile/page.tsx"
    const completeProfileRoute = "src/app/api/auth/complete-profile/route.ts"

    const googleContent = fs.readFileSync(googleRouteFile, "utf8")
    const callbackContent = fs.readFileSync(callbackRouteFile, "utf8")
    const authContent = fs.readFileSync(authLibFile, "utf8")
    const pageContent = fs.readFileSync(completeProfilePage, "utf8")
    const routeContent = fs.readFileSync(completeProfileRoute, "utf8")

    const hasGooglePhoneScope = googleContent.includes("openid email profile phone")
    const hasPhoneExtraction = callbackContent.includes("googlePhone") && callbackContent.includes("phone_number")
    const hasAuthPhonePayload = authContent.includes("phone?: string | null") && authContent.includes("phoneVerified: true")
    const hasBypassedOtpUi = !pageContent.includes("handleSendOtp") && pageContent.includes("Personal & Contact Details")
    const hasAutoVerifiedPhone = routeContent.includes("phoneVerified: true")

    console.log(`  ✓ Google OAuth Requested Scope Includes Phone: ${hasGooglePhoneScope}`)
    console.log(`  ✓ Google UserInfo Profile Phone Extraction: ${hasPhoneExtraction}`)
    console.log(`  ✓ OAuth User Creation Sets phoneVerified = true: ${hasAuthPhonePayload}`)
    console.log(`  ✓ Termii SMS OTP Step Bypassed in Onboarding UI: ${hasBypassedOtpUi}`)
    console.log(`  ✓ Backend Profile Completion Marks phoneVerified = true: ${hasAutoVerifiedPhone}`)

    if (!hasGooglePhoneScope || !hasPhoneExtraction || !hasAuthPhonePayload || !hasBypassedOtpUi || !hasAutoVerifiedPhone) {
      throw new Error("FAIL: Direct Google Phone & SMS Bypass audit failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 DIRECT GOOGLE PHONE & SMS BYPASS VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ DIRECT GOOGLE PHONE AUDIT FAILED:", err)
    process.exit(1)
  }
}

testDirectGooglePhoneOnboarding()
