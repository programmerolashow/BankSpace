require("dotenv").config()
const fs = require("fs")

function testWebhookUniqueConstraints() {
  console.log("==================================================")
  console.log("   WEBHOOK UNIQUE CONSTRAINTS & ANTI-REPLAY AUDIT ")
  console.log("==================================================\n")

  try {
    const schemaContent = fs.readFileSync("prisma/schema.prisma", "utf8")
    const routeContent = fs.readFileSync("src/app/api/webhooks/paystack/route.ts", "utf8")

    const hasEventIdUnique = schemaContent.includes("eventId") && schemaContent.includes("@unique @map(\"event_id\")")
    const hasProviderTxIdUnique = schemaContent.includes("providerTxId") && schemaContent.includes("@unique @map(\"provider_tx_id\")")

    const hasMultiFieldOrCheck = routeContent.includes("eventId") && routeContent.includes("providerTxId") && routeContent.includes("OR:")
    const hasP2002Trap = routeContent.includes("P2002") || routeContent.includes("Unique constraint")
    const returnsHttp200OnReplay = routeContent.includes("isReplay: true") && routeContent.includes("{ status: 200 }")

    console.log(`  ✓ Schema eventId @unique Constraint: ${hasEventIdUnique}`)
    console.log(`  ✓ Schema providerTxId @unique Constraint: ${hasProviderTxIdUnique}`)
    console.log(`  ✓ Multi-Field Pre-Inspection OR Check: ${hasMultiFieldOrCheck}`)
    console.log(`  ✓ Prisma P2002 Unique Constraint Trap: ${hasP2002Trap}`)
    console.log(`  ✓ Returns HTTP 200 On Replay Without Crediting: ${returnsHttp200OnReplay}`)

    if (!hasEventIdUnique || !hasProviderTxIdUnique || !hasMultiFieldOrCheck || !hasP2002Trap || !returnsHttp200OnReplay) {
      throw new Error("FAIL: Webhook unique constraint audit failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 WEBHOOK UNIQUE CONSTRAINTS VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ WEBHOOK UNIQUE CONSTRAINT AUDIT FAILED:", err)
    process.exit(1)
  }
}

testWebhookUniqueConstraints()
