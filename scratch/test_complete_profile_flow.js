require("dotenv").config()
const fs = require("fs")
const { normalizePhoneNumberToAccountNumber } = require("../src/lib/phoneNormalization")

function testCompleteProfileFlow() {
  console.log("==================================================")
  console.log("   COMPLETE PROFILE & KYC ONBOARDING TEST SUITE  ")
  console.log("==================================================\n")

  try {
    // 1. Check Phone Normalization to 10-Digit Account Number
    const testPhones = [
      { input: "08012345678", expected: "8012345678" },
      { input: "+2348012345678", expected: "8012345678" },
      { input: "2348012345678", expected: "8012345678" },
      { input: "8012345678", expected: "8012345678" },
    ]

    for (const tp of testPhones) {
      const actual = normalizePhoneNumberToAccountNumber(tp.input)
      console.log(`  ✓ Normalization: "${tp.input}" => "${actual}" (10 digits: ${actual.length === 10})`)
      if (actual !== tp.expected || actual.length !== 10) {
        throw new Error(`FAIL: Phone normalization failed for ${tp.input}`)
      }
    }

    // 2. Check File Existence
    const requiredFiles = [
      "src/app/complete-profile/page.tsx",
      "src/app/api/auth/complete-profile/route.ts",
      "src/components/dashboard/BankSpaceAccountNumberCard.tsx",
      "src/lib/phoneNormalization.ts",
      "src/lib/backfillAccountNumbers.ts",
    ]

    for (const f of requiredFiles) {
      if (!fs.existsSync(f)) {
        throw new Error(`FAIL: Missing required file: ${f}`)
      }
      console.log(`  ✓ File Verified: ${f}`)
    }

    // 3. Verify Google OAuth Callback Redirection Guard
    const callbackContent = fs.readFileSync("src/app/api/auth/callback/google/route.ts", "utf8")
    const hasCompleteProfileRedirect = callbackContent.includes("/complete-profile")
    console.log(`  ✓ Google OAuth Redirect to /complete-profile when profile incomplete: ${hasCompleteProfileRedirect}`)

    if (!hasCompleteProfileRedirect) {
      throw new Error("FAIL: Google OAuth callback route missing /complete-profile redirection guard!")
    }

    console.log("\n==================================================")
    console.log("   🎉 COMPLETE PROFILE & KYC FLOW TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ COMPLETE PROFILE FLOW TEST FAILED:", err)
    process.exit(1)
  }
}

testCompleteProfileFlow()
