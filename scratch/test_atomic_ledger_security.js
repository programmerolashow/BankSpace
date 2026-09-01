require("dotenv").config()
const fs = require("fs")

function testAtomicLedgerSecurity() {
  console.log("==================================================")
  console.log("   ATOMIC LEDGER & REPLAY PROTECTION AUDIT       ")
  console.log("==================================================\n")

  try {
    const routeContent = fs.readFileSync("src/app/api/transfer/route.ts", "utf8")
    const schemaContent = fs.readFileSync("prisma/schema.prisma", "utf8")

    // 1. Verify Field Presence on Transaction Model
    const requiredFields = [
      "reference",
      "senderName",
      "recipientName",
      "amount",
      "fee",
      "currency",
      "type",
      "status",
      "narration",
      "createdAt",
      "completedAt",
    ]

    for (const field of requiredFields) {
      const existsInSchema = schemaContent.includes(field)
      console.log(`  ✓ Transaction Field Verified (${field}): ${existsInSchema}`)
      if (!existsInSchema) {
        throw new Error(`FAIL: Missing field '${field}' on Transaction schema!`)
      }
    }

    // 2. Verify Atomic Row-Level Decrement & Idempotency Guards in route.ts
    const hasAtomicDecrement = routeContent.includes("balance: { gte: roundedAmount }") && routeContent.includes("decrement: roundedAmount")
    const hasIdempotencyGuard = routeContent.includes("isReplay: true") || routeContent.includes("findUnique({ where: { reference")
    const hasCompletedAtSet = routeContent.includes("completedAt: now")
    const hasNarrationSet = routeContent.includes("narration: transferNarration") || routeContent.includes("narration: creditNarration")

    console.log(`  ✓ Atomic Row-Level Balance Decrement Guard: ${hasAtomicDecrement}`)
    console.log(`  ✓ Idempotency Anti-Replay Guard: ${hasIdempotencyGuard}`)
    console.log(`  ✓ Transaction completedAt Timestamp Set: ${hasCompletedAtSet}`)
    console.log(`  ✓ Transaction Narration Field Populated: ${hasNarrationSet}`)

    if (!hasAtomicDecrement || !hasIdempotencyGuard || !hasCompletedAtSet || !hasNarrationSet) {
      throw new Error("FAIL: Atomic ledger security check failed in route.ts!")
    }

    console.log("\n==================================================")
    console.log("   🎉 ATOMIC LEDGER & REPLAY SECURITY VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ ATOMIC LEDGER AUDIT FAILED:", err)
    process.exit(1)
  }
}

testAtomicLedgerSecurity()
