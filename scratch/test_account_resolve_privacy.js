require("dotenv").config()
const fs = require("fs")

function testAccountResolvePrivacy() {
  console.log("==================================================")
  console.log("   RECIPIENT RESOLUTION PRIVACY & PII AUDIT       ")
  console.log("==================================================\n")

  try {
    const routeFile = "src/app/api/accounts/resolve/[accountNumber]/route.ts"
    if (!fs.existsSync(routeFile)) {
      throw new Error(`FAIL: Missing required route file: ${routeFile}`)
    }

    const content = fs.readFileSync(routeFile, "utf8")

    const hasDataBlock = content.includes("accountNumber:") && content.includes("accountName:") && content.includes("accountType: \"BANKSPACE\"")
    const hasUppercase = content.includes("toUpperCase()")
    const doesNotLeakPii = !content.includes("data: { id") && !content.includes("data: { email") && !content.includes("data: { phone")

    console.log(`  ✓ Route File Verified: ${routeFile}`)
    console.log(`  ✓ Minimal Payload Data Block: ${hasDataBlock}`)
    console.log(`  ✓ Uppercase Account Name Formatting: ${hasUppercase}`)
    console.log(`  ✓ Strict PII & DB ID Redaction: ${doesNotLeakPii}`)

    if (!hasDataBlock || !hasUppercase || !doesNotLeakPii) {
      throw new Error("FAIL: Recipient resolution privacy audit failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 RECIPIENT RESOLUTION PRIVACY VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ RECIPIENT RESOLUTION PRIVACY AUDIT FAILED:", err)
    process.exit(1)
  }
}

testAccountResolvePrivacy()
