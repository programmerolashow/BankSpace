require("dotenv").config()
const fs = require("fs")

function testNotificationTemplates() {
  console.log("==================================================")
  console.log("   STANDARDIZED PUSH NOTIFICATION TEMPLATES AUDIT ")
  console.log("==================================================\n")

  try {
    const notifFile = "src/lib/notifications.ts"
    if (!fs.existsSync(notifFile)) {
      throw new Error(`FAIL: Missing notifications library: ${notifFile}`)
    }

    const content = fs.readFileSync(notifFile, "utf8")

    const hasP2pTemplate = content.includes("notifyIncomingP2PTransfer") && content.includes("You received ₦")
    const hasBankTemplate = content.includes("notifyIncomingBankTransfer") && content.includes("was received into your BankSpace account from")
    const hasKycSuccessTemplate = content.includes("notifyKycVerificationSuccess") && content.includes("Your identity verification has been completed successfully.")
    const hasKycFailTemplate = content.includes("notifyKycVerificationFailure") && content.includes("We couldn't verify your identity. Please review your information and try again.")
    const hasDvaTemplate = content.includes("notifyVirtualAccountCreated") && content.includes("Your BankSpace receiving account is ready.")

    console.log(`  ✓ Helper 1: Incoming BankSpace Transfer (P2P): ${hasP2pTemplate}`)
    console.log(`  ✓ Helper 2: Incoming Bank Transfer (External Bank via DVA): ${hasBankTemplate}`)
    console.log(`  ✓ Helper 3: KYC Verification Success: ${hasKycSuccessTemplate}`)
    console.log(`  ✓ Helper 4: KYC Verification Failure: ${hasKycFailTemplate}`)
    console.log(`  ✓ Helper 5: Virtual Account Provisioning: ${hasDvaTemplate}`)

    if (!hasP2pTemplate || !hasBankTemplate || !hasKycSuccessTemplate || !hasKycFailTemplate || !hasDvaTemplate) {
      throw new Error("FAIL: Notification template check failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 STANDARDIZED NOTIFICATION TEMPLATES VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ NOTIFICATION TEMPLATES AUDIT FAILED:", err)
    process.exit(1)
  }
}

testNotificationTemplates()
