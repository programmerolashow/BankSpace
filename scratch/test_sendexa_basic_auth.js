require("dotenv").config()
const fs = require("fs")

function testSendExaBasicAuth() {
  console.log("==================================================")
  console.log("   SENDEXA BASIC AUTH HEADER AUDIT                ")
  console.log("==================================================\n")

  try {
    const serviceFile = "src/lib/otpService.ts"
    if (!fs.existsSync(serviceFile)) {
      throw new Error(`FAIL: Missing otpService.ts file: ${serviceFile}`)
    }

    const content = fs.readFileSync(serviceFile, "utf8")

    const hasBasicAuth = content.includes("Basic ") && content.includes("Authorization")
    const hasContentType = content.includes('"Content-Type": "application/json"')

    console.log(`  ✓ Authorization: Basic \${apiToken} Header: ${hasBasicAuth}`)
    console.log(`  ✓ Content-Type: application/json Header: ${hasContentType}`)

    if (!hasBasicAuth || !hasContentType) {
      throw new Error("FAIL: SendExa Basic Auth audit failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 SENDEXA BASIC AUTH HEADER VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ SENDEXA BASIC AUTH AUDIT FAILED:", err)
    process.exit(1)
  }
}

testSendExaBasicAuth()
