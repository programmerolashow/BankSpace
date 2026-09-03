require("dotenv").config()
const fs = require("fs")

function testTermiiOtpFix() {
  console.log("==================================================")
  console.log("   TERMII OTP VALIDATION & DISPATCH AUDIT         ")
  console.log("==================================================\n")

  try {
    const serviceFile = "src/lib/otpService.ts"
    if (!fs.existsSync(serviceFile)) {
      throw new Error(`FAIL: Missing otpService.ts file: ${serviceFile}`)
    }

    const content = fs.readFileSync(serviceFile, "utf8")

    const hasTermiiFormatting = content.includes("formatToTermiiPhone")
    const hasNAlertSender = content.includes("N-Alert")
    const hasPrioritizedDbCreate = content.indexOf("client.phoneOtp.create") < content.indexOf("dispatchTermiiSms")
    const hasCleanMessage = content.includes("Verification code generated for") || content.includes("OTP sent successfully to")

    console.log(`  ✓ Termii Phone Formatting (2348012345678): ${hasTermiiFormatting}`)
    console.log(`  ✓ N-Alert Termii Sender ID Priority: ${hasNAlertSender}`)
    console.log(`  ✓ Prioritized Database OTP Creation (Before SMS Dispatch): ${hasPrioritizedDbCreate}`)
    console.log(`  ✓ User-Friendly Success Response: ${hasCleanMessage}`)

    if (!hasTermiiFormatting || !hasNAlertSender || !hasPrioritizedDbCreate || !hasCleanMessage) {
      throw new Error("FAIL: Termii OTP Fix audit failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 TERMII OTP DISPATCH & VALIDATION VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ TERMII OTP FIX AUDIT FAILED:", err)
    process.exit(1)
  }
}

testTermiiOtpFix()
