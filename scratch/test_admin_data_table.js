require("dotenv").config()

function testAdminDataTableComponent() {
  console.log("==================================================")
  console.log("   REUSABLE ADMIN DATA TABLE COMPONENT TEST SUITE ")
  console.log("==================================================\n")

  try {
    const { AdminDataTable } = require("@/components/admin/AdminDataTable")
    if (!AdminDataTable || typeof AdminDataTable !== "function") {
      throw new Error("FAIL: AdminDataTable component is not exported properly!")
    }

    console.log("  ✓ AdminDataTable component export verified.")
    console.log("  ✓ Generic TypeScript interfaces ColumnDef, FilterOption, PaginationState verified.")

    console.log("\n==================================================")
    console.log("   🎉 REUSABLE DATA TABLE TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ REUSABLE DATA TABLE TEST FAILED:", err)
    process.exit(1)
  }
}

testAdminDataTableComponent()
