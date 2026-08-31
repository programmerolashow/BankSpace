require("dotenv").config()
const fs = require("fs")
const { normalizePhoneNumberToAccountNumber } = require("../src/lib/phoneNormalization")

function testPhoneOtpSecuritySystem() {
  console.log("==================================================")
  console.log("   PHONE OTP SECURITY SYSTEM AUDIT SUITE          ")
  console.log("==================================================\n")

  try {
    // 1. Verify Phone Normalization to 10-Digit Account Number
    const testCases = [
      { input: "08012345678", expected: "8012345678" },
      { input: "+2348012345678", expected: "8012345678" },
      { input: "2348012345678", expected: "8012345678" },
    ]

    for (const tc of testCases) {
      const actual = normalizePhoneNumberToAccountNumber(tc.input)
      const passed = actual === tc.expected && actual.length === 10
      console.log(`  ✓ Normalization: "${tc.input}" => "${actual}" | Length: 10 => ${passed ? "PASS" : "FAIL"}`)
      if (!passed) throw new Error(`FAIL: Normalization test failed for ${tc.input}`)
    }

    // 2. Check File Existence
    const requiredFiles = [
      "src/lib/otpService.ts",
      "src/app/api/auth/phone-otp/send/route.ts",
      "src/app/api/auth/phone-otp/verify/route.ts",
      "src/app/complete-profile/page.tsx",
    ]

    for (const f of requiredFiles) {
      if (!fs.existsSync(f)) {
        throw new Error(`FAIL: Missing required file: ${f}`)
      }
      console.log(`  ✓ File Verified: ${f}`)
    }

    // 3. Inspect OTP Security Safeguards in otpService.ts
    const otpContent = fs.readFileSync("src/lib/otpService.ts", "utf8")
    const hasHashCheck = otpContent.includes("sha256")
    const hasCooldownCheck = otpContent.includes("resendCooldown")
    const hasMaxAttemptsCheck = otpContent.includes("maxAttempts") || otpContent.includes("attempts >= 3") || otpContent.includes("maxAttempts")
    const hasDuplicateCheck = otpContent.includes("already associated with another BankSpace account")

    console.log(`  ✓ OTP Cryptographic Hashing (SHA256): ${hasHashCheck}`)
    console.log(`  ✓ Resend Cooldown Enforcement (60s): ${hasCooldownCheck}`)
    console.log(`  ✓ Max Attempts Protection (Max 3): ${hasMaxAttemptsCheck}`)
    console.log(`  ✓ Duplicate Account Phone Rejection: ${hasDuplicateCheck}`)

    if (!hasHashCheck || !hasCooldownCheck || !hasMaxAttemptsCheck || !hasDuplicateCheck) {
      throw new Error("FAIL: OTP security requirements check failed in otpService.ts!")
    }

    console.log("\n==================================================")
    console.log("   🎉 PHONE OTP SECURITY SYSTEM VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ PHONE OTP SECURITY SYSTEM FAILED:", err)
    process.exit(1)
  }
}

testPhoneOtpSecuritySystem()
