require("dotenv").config()
const fs = require("fs")
const { maskBvnNumber, verifyBvnWithProvider } = require("../src/lib/bvnVerificationService")

async function testBvnVerificationSubsystem() {
  console.log("==================================================")
  console.log("   BVN VERIFICATION & IDENTITY MATCHING AUDIT     ")
  console.log("==================================================\n")

  try {
    // 1. Test BVN Masking Security (22212345678 -> 222*****678)
    const rawBvn = "22212345678"
    const masked = maskBvnNumber(rawBvn)
    console.log(`  ✓ Masking Security: "${rawBvn}" => "${masked}" (Exposes zero full digits)`)

    if (masked !== "222*****678" || masked.includes("12345")) {
      throw new Error("FAIL: BVN masking security requirement failed!")
    }

    // 2. Test Verification Matching Logic - Valid Identity Match
    const validResult = await verifyBvnWithProvider({
      userId: "test_user_001",
      bvn: "22212345678",
      firstName: "Illias",
      lastName: "User",
      dob: "1995-05-15",
    })

    console.log(`  ✓ Valid Identity Match Status: ${validResult.status}`)
    console.log(`  ✓ Provider Reference Generated: ${validResult.referenceId}`)
    console.log(`  ✓ Masked BVN Returned: ${validResult.maskedBvn}`)

    if (validResult.status !== "VERIFIED" || !validResult.success) {
      throw new Error("FAIL: Valid identity match did not return VERIFIED status")
    }

    // 3. Test Verification Matching Logic - Invalid BVN (00...)
    const invalidResult = await verifyBvnWithProvider({
      userId: "test_user_002",
      bvn: "00012345678",
      firstName: "Unknown",
      lastName: "Person",
      dob: "2000-01-01",
    })

    console.log(`  ✓ Mismatch/Invalid BVN Status: ${invalidResult.status}`)
    console.log(`  ✓ Failure Reason Recorded: "${invalidResult.failureReason}"`)

    if (invalidResult.status !== "FAILED" || !invalidResult.failureReason) {
      throw new Error("FAIL: Mismatched/Invalid BVN did not return FAILED status")
    }

    // 4. Verify API Endpoints and Admin Integration Files
    const requiredFiles = [
      "src/lib/bvnVerificationService.ts",
      "src/app/api/auth/bvn/verify/route.ts",
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
    console.log("   🎉 BVN VERIFICATION SUBSYSTEM VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ BVN VERIFICATION SUBSYSTEM FAILED:", err)
    process.exit(1)
  }
}

testBvnVerificationSubsystem()
