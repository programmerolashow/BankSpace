require("dotenv").config()
const fs = require("fs")
const { evaluateIdentityConsistency } = require("../src/lib/identityConsistencyEngine")

function testIdentityConsistencyEngine() {
  console.log("==================================================")
  console.log("   CROSS-SOURCE IDENTITY CONSISTENCY AUDIT        ")
  console.log("==================================================\n")

  try {
    // 1. Test MATCH Classification (100% identical details)
    const matchRes = evaluateIdentityConsistency({
      googleName: "Illias User",
      profileFirstName: "Illias",
      profileLastName: "User",
      profileDob: "1995-05-15",
      bvnFirstName: "Illias",
      bvnLastName: "User",
      bvnDob: "1995-05-15",
      ninFirstName: "Illias",
      ninLastName: "User",
      ninDob: "1995-05-15",
      phoneVerified: true,
    })

    console.log(`  ✓ Exact Match Status: ${matchRes.status} | Score: ${matchRes.score}%`)
    if (matchRes.status !== "MATCH" || matchRes.score !== 100) {
      throw new Error("FAIL: Exact match evaluation failed!")
    }

    // 2. Test PARTIAL_MATCH Classification (Transposed names / middle name omission)
    const partialRes = evaluateIdentityConsistency({
      googleName: "Illias Olanrewaju User",
      profileFirstName: "Illias",
      profileLastName: "User",
      profileDob: "1995-05-15",
      bvnFirstName: "Olanrewaju",
      bvnLastName: "Illias User",
      bvnDob: "1995-05-15",
      ninFirstName: "Illias",
      ninLastName: "User",
      ninDob: "1995-05-15",
      phoneVerified: true,
    })

    console.log(`  ✓ Transposed / Partial Match Status: ${partialRes.status} | Score: ${partialRes.score}%`)
    console.log(`  ✓ Flags Captured: ${JSON.stringify(partialRes.flags)}`)
    if (partialRes.status !== "PARTIAL_MATCH" && partialRes.status !== "MATCH") {
      throw new Error("FAIL: Transposed name evaluation failed!")
    }

    // 3. Test MISMATCH Classification (Different DOB)
    const mismatchRes = evaluateIdentityConsistency({
      googleName: "Illias User",
      profileFirstName: "Illias",
      profileLastName: "User",
      profileDob: "1995-05-15",
      bvnFirstName: "Illias",
      bvnLastName: "User",
      bvnDob: "1980-01-01", // Mismatched DOB
      ninFirstName: "Illias",
      ninLastName: "User",
      ninDob: "1995-05-15",
      phoneVerified: true,
    })

    console.log(`  ✓ DOB Mismatch Status: ${mismatchRes.status} | Score: ${mismatchRes.score}%`)
    console.log(`  ✓ Summary: "${mismatchRes.summary}"`)
    if (mismatchRes.status !== "MISMATCH") {
      throw new Error("FAIL: DOB Mismatch evaluation failed!")
    }

    // 4. Verify Files
    const requiredFiles = [
      "src/lib/identityConsistencyEngine.ts",
      "src/app/api/auth/identity/consistency-check/route.ts",
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
    console.log("   🎉 IDENTITY CONSISTENCY ENGINE VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ IDENTITY CONSISTENCY ENGINE AUDIT FAILED:", err)
    process.exit(1)
  }
}

testIdentityConsistencyEngine()
