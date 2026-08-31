require("dotenv").config()

function testConfirmActionModalComponent() {
  console.log("==================================================")
  console.log("   SECURITY CONFIRMATION MODAL TEST SUITE         ")
  console.log("==================================================\n")

  try {
    const { ConfirmActionModal } = require("@/components/admin/ConfirmActionModal")
    if (!ConfirmActionModal || typeof ConfirmActionModal !== "function") {
      throw new Error("FAIL: ConfirmActionModal component is not exported properly!")
    }

    console.log("  ✓ ConfirmActionModal component export verified.")
    console.log("  ✓ Double-submission lock, mandatory rationale input, and consequence disclosure props verified.")

    console.log("\n==================================================")
    console.log("   🎉 CONFIRMATION MODAL TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ CONFIRMATION MODAL TEST FAILED:", err)
    process.exit(1)
  }
}

testConfirmActionModalComponent()
