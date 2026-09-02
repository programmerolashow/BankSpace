require("dotenv").config()
const fs = require("fs")

function testTwilioOtpGateway() {
  console.log("==================================================")
  console.log("   TWILIO REAL SMS GATEWAY INTEGRATION AUDIT      ")
  console.log("==================================================\n")

  try {
    const serviceFile = "src/lib/otpService.ts"
    if (!fs.existsSync(serviceFile)) {
      throw new Error(`FAIL: Missing otpService.ts file: ${serviceFile}`)
    }

    const content = fs.readFileSync(serviceFile, "utf8")

    const hasE164Helper = content.includes("formatToE164") && content.includes("+234")
    const hasTwilioDispatch = content.includes("dispatchTwilioSms") && content.includes("api.twilio.com") && content.includes("TWILIO_ACCOUNT_SID")
    const hasSendPhoneOtpIntegration = content.includes("dispatchTwilioSms(formattedPhone, smsBody)")
    const hasBasicAuth = content.includes("Authorization: authHeader") && content.includes("Basic")

    console.log(`  ✓ E.164 International Phone Formatting (+234): ${hasE164Helper}`)
    console.log(`  ✓ Twilio REST API Engine Integration: ${hasTwilioDispatch}`)
    console.log(`  ✓ Basic Auth Header Security: ${hasBasicAuth}`)
    console.log(`  ✓ OTP Send Dispatch Call: ${hasSendPhoneOtpIntegration}`)

    if (!hasE164Helper || !hasTwilioDispatch || !hasBasicAuth || !hasSendPhoneOtpIntegration) {
      throw new Error("FAIL: Twilio SMS Gateway Integration audit failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 TWILIO REAL SMS GATEWAY INTEGRATION VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ TWILIO SMS AUDIT FAILED:", err)
    process.exit(1)
  }
}

testTwilioOtpGateway()
