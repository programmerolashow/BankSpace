require("dotenv").config()
const fs = require("fs")
const { deriveUserKycState, enforceBackendKycAccess } = require("../src/lib/kycStateEngine")

function testKycStateEngine() {
  console.log("==================================================")
  console.log("   CENTRALIZED KYC STATE ENGINE AUDIT SUITE       ")
  console.log("==================================================\n")

  try {
    // 1. Test Unauthenticated / Incomplete Profile State
    const incompleteRes = deriveUserKycState({
      id: "usr_1",
      firstName: null,
      lastName: null,
    })
    console.log(`  ✓ Incomplete Profile State: ${incompleteRes.state} | Access: ${incompleteRes.accessLevel}`)
    if (incompleteRes.state !== "PROFILE_INCOMPLETE" || incompleteRes.accessLevel !== "LIMITED") {
      throw new Error("FAIL: Profile incomplete derivation failed!")
    }

    // 2. Test Phone Pending State
    const phonePendingRes = deriveUserKycState({
      id: "usr_2",
      firstName: "Illias",
      lastName: "User",
      dob: "1995-05-15",
      phoneVerified: false,
    })
    console.log(`  ✓ Phone Pending State: ${phonePendingRes.state} | Access: ${phonePendingRes.accessLevel}`)
    if (phonePendingRes.state !== "PHONE_PENDING" || phonePendingRes.accessLevel !== "LIMITED") {
      throw new Error("FAIL: Phone pending derivation failed!")
    }

    // 3. Test KYC Failed State (BVN/NIN mismatch)
    const kycFailedRes = deriveUserKycState({
      id: "usr_3",
      firstName: "Illias",
      lastName: "User",
      dob: "1995-05-15",
      phoneVerified: true,
      bvnStatus: "FAILED",
      ninStatus: "VERIFIED",
      identityConsistencyStatus: "MISMATCH",
    })
    console.log(`  ✓ KYC Failed State: ${kycFailedRes.state} | Access: ${kycFailedRes.accessLevel}`)
    if (kycFailedRes.state !== "KYC_FAILED" || kycFailedRes.accessLevel !== "RESTRICTED") {
      throw new Error("FAIL: KYC Failed derivation failed!")
    }

    // 4. Test Suspended State
    const suspendedRes = deriveUserKycState({
      id: "usr_4",
      firstName: "Illias",
      lastName: "User",
      dob: "1995-05-15",
      phoneVerified: true,
      bvnStatus: "VERIFIED",
      ninStatus: "VERIFIED",
      identityConsistencyStatus: "MATCH",
      kycStatus: "SUSPENDED",
    })
    console.log(`  ✓ Suspended State: ${suspendedRes.state} | Access: ${suspendedRes.accessLevel}`)
    if (suspendedRes.state !== "SUSPENDED" || suspendedRes.accessLevel !== "NO_TRANSACTIONS") {
      throw new Error("FAIL: Suspended derivation failed!")
    }

    // 5. Test Active Fully Verified State
    const activeRes = deriveUserKycState({
      id: "usr_5",
      firstName: "Illias",
      lastName: "User",
      dob: "1995-05-15",
      phoneVerified: true,
      bvnStatus: "VERIFIED",
      ninStatus: "VERIFIED",
      identityConsistencyStatus: "MATCH",
      kycStatus: "VERIFIED",
    })
    console.log(`  ✓ Active Verified State: ${activeRes.state} | Access: ${activeRes.accessLevel}`)
    if (activeRes.state !== "ACTIVE" || activeRes.accessLevel !== "FULL_ACCOUNT") {
      throw new Error("FAIL: Active verified derivation failed!")
    }

    // 6. Test Backend Enforcement Guard on Restricted User
    const guardCheck = enforceBackendKycAccess(
      {
        id: "usr_restricted",
        firstName: "Illias",
        lastName: "User",
        dob: "1995-05-15",
        phoneVerified: true,
        bvnStatus: "FAILED",
        ninStatus: "VERIFIED",
        identityConsistencyStatus: "MISMATCH",
      },
      "FULL_ACCOUNT"
    )

    console.log(`  ✓ Backend Guard Enforcement (Blocked Restricted User): ${!guardCheck.allowed}`)
    if (guardCheck.allowed) {
      throw new Error("FAIL: Backend guard allowed restricted user to make full financial transfer!")
    }

    // 7. Verify Core Infrastructure Files
    const requiredFiles = [
      "src/lib/kycStateEngine.ts",
      "src/app/api/auth/me/route.ts",
      "src/app/api/transfer/route.ts",
      "src/app/api/deposit/initialize/route.ts",
    ]

    for (const f of requiredFiles) {
      if (!fs.existsSync(f)) {
        throw new Error(`FAIL: Missing required file: ${f}`)
      }
      console.log(`  ✓ File Verified: ${f}`)
    }

    console.log("\n==================================================")
    console.log("   🎉 CENTRALIZED KYC STATE ENGINE VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ CENTRALIZED KYC STATE ENGINE AUDIT FAILED:", err)
    process.exit(1)
  }
}

testKycStateEngine()
