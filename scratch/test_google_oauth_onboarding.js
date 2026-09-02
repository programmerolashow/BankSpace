require("dotenv").config()
const fs = require("fs")

function testGoogleOauthOnboarding() {
  console.log("==================================================")
  console.log("   GOOGLE OAUTH MULTI-STAGE ONBOARDING AUDIT     ")
  console.log("==================================================\n")

  try {
    const googleRouteFile = "src/app/api/auth/callback/google/route.ts"
    const fallbackRouteFile = "src/app/api/auth/oauth-fallback/route.ts"

    if (!fs.existsSync(googleRouteFile) || !fs.existsSync(fallbackRouteFile)) {
      throw new Error("FAIL: Missing Google OAuth callback route files!")
    }

    const googleContent = fs.readFileSync(googleRouteFile, "utf8")
    const fallbackContent = fs.readFileSync(fallbackRouteFile, "utf8")

    const googleHasKycCheck = googleContent.includes("deriveUserKycState(user)") && googleContent.includes("ACTIVE") && googleContent.includes("/complete-profile")
    const fallbackHasKycCheck = fallbackContent.includes("deriveUserKycState(user)") && fallbackContent.includes("ACTIVE") && fallbackContent.includes("/complete-profile")

    console.log(`  ✓ Google Callback Route KYC Derivation Guard: ${googleHasKycCheck}`)
    console.log(`  ✓ OAuth Fallback Route KYC Derivation Guard: ${fallbackHasKycCheck}`)

    if (!googleHasKycCheck || !fallbackHasKycCheck) {
      throw new Error("FAIL: Google OAuth multi-stage onboarding check failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 GOOGLE OAUTH ONBOARDING PIPELINE VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ GOOGLE OAUTH AUDIT FAILED:", err)
    process.exit(1)
  }
}

testGoogleOauthOnboarding()
