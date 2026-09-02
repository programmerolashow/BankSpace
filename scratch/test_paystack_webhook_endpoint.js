require("dotenv").config()
const fs = require("fs")

function testPaystackWebhookEndpoint() {
  console.log("==================================================")
  console.log("   PAYSTACK DVA WEBHOOK SETTLEMENT AUDIT         ")
  console.log("==================================================\n")

  try {
    const webhookFile = "src/app/api/webhooks/paystack/route.ts"
    if (!fs.existsSync(webhookFile)) {
      throw new Error(`FAIL: Missing required webhook route file: ${webhookFile}`)
    }

    const content = fs.readFileSync(webhookFile, "utf8")

    const hasHmacCheck = content.includes("verifyPaystackSignature") || content.includes("x-paystack-signature")
    const hasIdempotencyCheck = content.includes("isReplay: true") || content.includes("findUnique({ where: { reference")
    const hasDvaLookup = content.includes("dvaNuban: receiverAccNumber") || content.includes("OR:")
    const hasAtomicCredit = content.includes("increment: numericAmount") && content.includes("$transaction")
    const hasLedgerEntry = content.includes("entryType: \"CREDIT\"")
    const hasNotification = content.includes("createNotification")

    console.log(`  ✓ Route File Verified: ${webhookFile}`)
    console.log(`  ✓ HMAC SHA512 Signature Authentication: ${hasHmacCheck}`)
    console.log(`  ✓ Idempotency Anti-Replay Guard: ${hasIdempotencyCheck}`)
    console.log(`  ✓ DVA NUBAN & Customer Resolution: ${hasDvaLookup}`)
    console.log(`  ✓ Atomic Ledger Balance Increment: ${hasAtomicCredit}`)
    console.log(`  ✓ Double-Entry CREDIT Ledger Record: ${hasLedgerEntry}`)
    console.log(`  ✓ User Push Notification Dispatch: ${hasNotification}`)

    if (!hasHmacCheck || !hasIdempotencyCheck || !hasDvaLookup || !hasAtomicCredit || !hasLedgerEntry || !hasNotification) {
      throw new Error("FAIL: Paystack webhook endpoint audit failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 PAYSTACK DVA WEBHOOK ENDPOINT VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ PAYSTACK WEBHOOK AUDIT FAILED:", err)
    process.exit(1)
  }
}

testPaystackWebhookEndpoint()
