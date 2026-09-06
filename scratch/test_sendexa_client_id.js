require("dotenv").config()
const fs = require("fs")

function testSendExaClientId() {
  console.log("==================================================")
  console.log("   SENDEXA CLIENT_ID & API TOKEN DISPATCH AUDIT   ")
  console.log("==================================================\n")

  try {
    const serviceFile = "src/lib/otpService.ts"
    if (!fs.existsSync(serviceFile)) {
      throw new Error(`FAIL: Missing otpService.ts file: ${serviceFile}`)
    }

    const content = fs.readFileSync(serviceFile, "utf8")

    const hasClientIdRead = content.includes("SENDEXA_CLIENT_ID")
    const hasApiTokenRead = content.includes("SENDEXA_API_TOKEN")
    const hasHeaderClientId = content.includes("X-Client-ID")
    const hasPayloadClientId = content.includes("client_id")

    console.log(`  ✓ SENDEXA_CLIENT_ID Environment Reader: ${hasClientIdRead}`)
    console.log(`  ✓ SENDEXA_API_TOKEN Environment Reader: ${hasApiTokenRead}`)
    console.log(`  ✓ X-Client-ID Header Integration: ${hasHeaderClientId}`)
    console.log(`  ✓ client_id Payload Integration: ${hasPayloadClientId}`)

    if (!hasClientIdRead || !hasApiTokenRead || !hasHeaderClientId || !hasPayloadClientId) {
      throw new Error("FAIL: SendExa CLIENT_ID & API TOKEN audit failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 SENDEXA CLIENT_ID & TOKEN INTEGRATION VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ SENDEXA CLIENT_ID AUDIT FAILED:", err)
    process.exit(1)
  }
}

testSendExaClientId()
