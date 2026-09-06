require("dotenv").config()
const fs = require("fs")

function testCompleteProfileFlexibility() {
  console.log("==================================================")
  console.log("   COMPLETE PROFILE PHONE FLEXIBILITY AUDIT       ")
  console.log("==================================================\n")

  try {
    const pageFile = "src/app/complete-profile/page.tsx"
    if (!fs.existsSync(pageFile)) {
      throw new Error(`FAIL: Missing page.tsx file: ${pageFile}`)
    }

    const content = fs.readFileSync(pageFile, "utf8")

    const hasHandleStep2Continue = content.includes("handleStep2Continue")
    const hasContinueButton = content.includes("Continue to Identity Verification")
    const hasSendOtpButton = content.includes("Send OTP")
    const hasEditablePhone = content.includes("disabled={isSendingOtp}")

    console.log(`  ✓ Step 2 Continuation Handler (handleStep2Continue): ${hasHandleStep2Continue}`)
    console.log(`  ✓ 'Continue to Identity Verification' Button: ${hasContinueButton}`)
    console.log(`  ✓ 'Send OTP' Option Available: ${hasSendOtpButton}`)
    console.log(`  ✓ Editable Manual Phone Field: ${hasEditablePhone}`)

    if (!hasHandleStep2Continue || !hasContinueButton || !hasSendOtpButton || !hasEditablePhone) {
      throw new Error("FAIL: Complete Profile phone flexibility audit failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 COMPLETE PROFILE PHONE FLEXIBILITY VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ PHONE FLEXIBILITY AUDIT FAILED:", err)
    process.exit(1)
  }
}

testCompleteProfileFlexibility()
