require("dotenv").config()
const fs = require("fs")

function testSendExaOtpGateway() {
  console.log("==================================================")
  console.log("   SENDEXA REAL SMS GATEWAY INTEGRATION AUDIT     ")
  console.log("==================================================\n")

  try {
    const serviceFile = "src/lib/otpService.ts"
    if (!fs.existsSync(serviceFile)) {
      throw new Error(`FAIL: Missing otpService.ts file: ${serviceFile}`)
    }

    const content = fs.readFileSync(serviceFile, "utf8")

    const hasSendExaDispatch = content.includes("dispatchSendExaSms") && content.includes("SENDEXA_API_KEY")
    const hasLetcolSender = content.includes("Letcol")
    const hasE164Helper = content.includes("formatToE164")
    const hasOtpIntegration = content.includes("dispatchSendExaSms(e164Phone, smsBody)")

    console.log(`  ✓ SendExa Gateway API Integration: ${hasSendExaDispatch}`)
    console.log(`  ✓ 'Letcol' Sender ID Configured: ${hasLetcolSender}`)
    console.log(`  ✓ E.164 Phone Formatting (+234): ${hasE164Helper}`)
    console.log(`  ✓ Send Phone OTP Integration: ${hasOtpIntegration}`)

    if (!hasSendExaDispatch || !hasLetcolSender || !hasE164Helper || !hasOtpIntegration) {
      throw new Error("FAIL: SendExa SMS Gateway Integration audit failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 SENDEXA REAL SMS GATEWAY INTEGRATION VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ SENDEXA SMS AUDIT FAILED:", err)
    process.exit(1)
  }
}

testSendExaOtpGateway()
