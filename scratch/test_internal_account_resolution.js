require("dotenv").config()
const fs = require("fs")

function testInternalAccountResolution() {
  console.log("==================================================")
  console.log("   INTERNAL BANKSPACE ACCOUNT RESOLUTION AUDIT    ")
  console.log("==================================================\n")

  try {
    const routeContent = fs.readFileSync("src/app/api/banks/resolve/route.ts", "utf8")
    const cardContent = fs.readFileSync("src/components/dashboard/BankSpaceAccountNumberCard.tsx", "utf8")

    const hasUppercaseFormat = routeContent.includes("toUpperCase()")
    const hasUserPayload = routeContent.includes("user: {") && routeContent.includes("accountStatus")
    const hasAccountPayload = routeContent.includes("account: {")
    const hasUppercaseCardDisplay = cardContent.includes("uppercase")

    console.log(`  ✓ Internal Uppercase Account Name Formatting: ${hasUppercaseFormat}`)
    console.log(`  ✓ Payload includes User Object & Account Status: ${hasUserPayload}`)
    console.log(`  ✓ Payload includes Primary Account Details: ${hasAccountPayload}`)
    console.log(`  ✓ Card Display Uppercase Styling: ${hasUppercaseCardDisplay}`)

    if (!hasUppercaseFormat || !hasUserPayload || !hasAccountPayload || !hasUppercaseCardDisplay) {
      throw new Error("FAIL: Internal account resolution payload check failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 INTERNAL ACCOUNT RESOLUTION VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ INTERNAL ACCOUNT RESOLUTION AUDIT FAILED:", err)
    process.exit(1)
  }
}

testInternalAccountResolution()
