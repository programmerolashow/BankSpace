require("dotenv").config()
const fs = require("fs")
const { maskNinNumber, verifyNinWithProvider } = require("../src/lib/ninVerificationService")

async function testNinVerificationSubsystem() {
  console.log("==================================================")
  console.log("   NIN VERIFICATION & IDENTITY MATCHING AUDIT     ")
  console.log("==================================================\n")

  try {
    // 1. Test NIN Masking Security (11123456789 -> 111*****789)
    const rawNin = "11123456789"
    const masked = maskNinNumber(rawNin)
    console.log(`  ✓ Masking Security: "${rawNin}" => "${masked}" (Exposes zero full digits)`)

    if (masked !== "111*****789" || masked.includes("23456")) {
      throw new Error("FAIL: NIN masking security requirement failed!")
    }

    // 2. Test Verification Matching Logic - Valid Identity Match
    const validResult = await verifyNinWithProvider({
      userId: "test_user_001",
      nin: "11123456789",
      firstName: "Illias",
      lastName: "User",
      dob: "1995-05-15",
    })

    console.log(`  ✓ Valid Identity Match Status: ${validResult.status}`)
    console.log(`  ✓ Provider Reference Generated: ${validResult.referenceId}`)
    console.log(`  ✓ Masked NIN Returned: ${validResult.maskedNin}`)

    if (validResult.status !== "VERIFIED" || !validResult.success) {
      throw new Error("FAIL: Valid identity match did not return VERIFIED status")
    }

    // 3. Test Verification Matching Logic - Invalid NIN (00...)
    const invalidResult = await verifyNinWithProvider({
      userId: "test_user_002",
      nin: "00012345678",
      firstName: "Unknown",
      lastName: "Person",
      dob: "2000-01-01",
    })

    console.log(`  ✓ Mismatch/Invalid NIN Status: ${invalidResult.status}`)
    console.log(`  ✓ Failure Reason Recorded: "${invalidResult.failureReason}"`)

    if (invalidResult.status !== "FAILED" || !invalidResult.failureReason) {
      throw new Error("FAIL: Mismatched/Invalid NIN did not return FAILED status")
    }

    // 4. Verify API Endpoints and Admin Integration Files
    const requiredFiles = [
      "src/lib/ninVerificationService.ts",
      "src/app/api/auth/nin/verify/route.ts",
      "src/app/api/auth/complete-profile/route.ts",
      "src/app/admin/kyc/page.tsx",
    ]

    for (const f of requiredFiles) {
      if (!fs.existsSync(f)) {
        throw new Error(`FAIL: Missing required file: ${f}`)
      }
      console.log(`  ✓ File Verified: ${f}`)
    }

    console.log("\n==================================================")
    console.log("   🎉 NIN VERIFICATION SUBSYSTEM VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ NIN VERIFICATION SUBSYSTEM FAILED:", err)
    process.exit(1)
  }
}

testNinVerificationSubsystem()
