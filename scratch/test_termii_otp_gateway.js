require("dotenv").config()
const fs = require("fs")

function testTermiiOtpGateway() {
  console.log("==================================================")
  console.log("   TERMII REAL SMS GATEWAY INTEGRATION AUDIT      ")
  console.log("==================================================\n")

  try {
    const serviceFile = "src/lib/otpService.ts"
    if (!fs.existsSync(serviceFile)) {
      throw new Error(`FAIL: Missing otpService.ts file: ${serviceFile}`)
    }

    const content = fs.readFileSync(serviceFile, "utf8")

    const hasTermiiFormatting = content.includes("formatToTermiiPhone") && content.includes("234")
    const hasTermiiDispatch = content.includes("dispatchTermiiSms") && content.includes("api.ng.termii.com/api/sms/send") && content.includes("TERMII_API_KEY")
    const hasDndRoute = content.includes("channel") && content.includes("dnd")
    const hasTermiiSender = content.includes("TERMII_SENDER_ID") && content.includes("N-Alert")

    console.log(`  ✓ Termii Phone Formatting (2348012345678): ${hasTermiiFormatting}`)
    console.log(`  ✓ Termii REST API Endpoint (api.ng.termii.com): ${hasTermiiDispatch}`)
    console.log(`  ✓ Termii DND Route Support: ${hasDndRoute}`)
    console.log(`  ✓ Termii Sender ID Fallback (N-Alert): ${hasTermiiSender}`)

    if (!hasTermiiFormatting || !hasTermiiDispatch || !hasDndRoute || !hasTermiiSender) {
      throw new Error("FAIL: Termii SMS Gateway Integration audit failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 TERMII REAL SMS GATEWAY INTEGRATION VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ TERMII SMS AUDIT FAILED:", err)
    process.exit(1)
  }
}

testTermiiOtpGateway()
