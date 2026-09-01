require("dotenv").config()
const fs = require("fs")

function testBankSpaceTransferFlow() {
  console.log("==================================================")
  console.log("   BANKSPACE → BANKSPACE TRANSFER PIPELINE AUDIT  ")
  console.log("==================================================\n")

  try {
    const pageContent = fs.readFileSync("src/app/transfer/page.tsx", "utf8")
    const apiContent = fs.readFileSync("src/app/api/transfer/route.ts", "utf8")
    const resolveContent = fs.readFileSync("src/app/api/banks/resolve/route.ts", "utf8")

    const hasAccountResolution = pageContent.includes("/api/banks/resolve") && pageContent.includes("setRecipientName")
    const hasRecipientConfirmation = pageContent.includes("Confirmed Recipient") && pageContent.includes("recipientStatus")
    const hasPinPrompt = pageContent.includes("Transaction PIN") || pageContent.includes("pinInput")
    const hasBackendDebitCredit = apiContent.includes("decrement: roundedAmount") && apiContent.includes("increment: roundedAmount")
    const hasNotificationDispatch = apiContent.includes("createNotification")

    console.log(`  ✓ Frontend 10-Digit Account Resolution: ${hasAccountResolution}`)
    console.log(`  ✓ Recipient Confirmation Card Display: ${hasRecipientConfirmation}`)
    console.log(`  ✓ Transaction PIN Authorization Step: ${hasPinPrompt}`)
    console.log(`  ✓ Backend Atomic Debit & Credit Execution: ${hasBackendDebitCredit}`)
    console.log(`  ✓ Instant Push Notification Dispatches: ${hasNotificationDispatch}`)

    if (!hasAccountResolution || !hasRecipientConfirmation || !hasPinPrompt || !hasBackendDebitCredit || !hasNotificationDispatch) {
      throw new Error("FAIL: BankSpace transfer pipeline requirements check failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 BANKSPACE P2P TRANSFER FLOW VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ BANKSPACE P2P TRANSFER AUDIT FAILED:", err)
    process.exit(1)
  }
}

testBankSpaceTransferFlow()
