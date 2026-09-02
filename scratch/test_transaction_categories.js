require("dotenv").config()
const fs = require("fs")

function testTransactionCategories() {
  console.log("==================================================")
  console.log("   TRANSACTION CATEGORIES & SOURCE TYPES AUDIT    ")
  console.log("==================================================\n")

  try {
    const schemaContent = fs.readFileSync("prisma/schema.prisma", "utf8")
    const transferRouteContent = fs.readFileSync("src/app/api/transfer/route.ts", "utf8")
    const webhookContent = fs.readFileSync("src/app/api/webhooks/paystack/route.ts", "utf8")
    const reconContent = fs.readFileSync("src/lib/dvaReconciliationService.ts", "utf8")
    const pageContent = fs.readFileSync("src/app/transactions/page.tsx", "utf8")

    const hasSourceTypeInSchema = schemaContent.includes("sourceType") && schemaContent.includes("@map(\"source_type\")")
    const hasInternalCategory = transferRouteContent.includes("INTERNAL_TRANSFER") && transferRouteContent.includes("BANKSPACE")
    const hasExternalOutCategory = transferRouteContent.includes("EXTERNAL_TRANSFER_OUT") && transferRouteContent.includes("sourceType: \"BANK\"")
    const hasExternalInCategory = webhookContent.includes("EXTERNAL_TRANSFER_IN") && webhookContent.includes("sourceType: \"BANK\"")
    const hasReconCategory = reconContent.includes("EXTERNAL_TRANSFER_IN")
    const hasBadgesInPage = pageContent.includes("BankSpace P2P") && pageContent.includes("External Bank")

    console.log(`  ✓ Schema sourceType Field Verified: ${hasSourceTypeInSchema}`)
    console.log(`  ✓ INTERNAL_TRANSFER Category & BANKSPACE Tag: ${hasInternalCategory}`)
    console.log(`  ✓ EXTERNAL_TRANSFER_OUT Category & BANK Tag: ${hasExternalOutCategory}`)
    console.log(`  ✓ EXTERNAL_TRANSFER_IN Category & BANK Tag (Webhook): ${hasExternalInCategory}`)
    console.log(`  ✓ EXTERNAL_TRANSFER_IN Category (Reconciliation): ${hasReconCategory}`)
    console.log(`  ✓ Transactions UI Badge Rendering: ${hasBadgesInPage}`)

    if (!hasSourceTypeInSchema || !hasInternalCategory || !hasExternalOutCategory || !hasExternalInCategory || !hasReconCategory || !hasBadgesInPage) {
      throw new Error("FAIL: Transaction Categories & Source Types Audit Failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 TRANSACTION CATEGORIES & SOURCE TYPES VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ TRANSACTION CATEGORIES AUDIT FAILED:", err)
    process.exit(1)
  }
}

testTransactionCategories()
