require("dotenv").config()

function testAdminModularArchitecture() {
  console.log("==================================================")
  console.log("   MODULAR ADMIN ARCHITECTURE INTEGRITY SUITE     ")
  console.log("==================================================\n")

  try {
    // 1. Validation Schemas
    const validation = require("@/lib/admin/adminValidation")
    if (typeof validation.validatePaginationParams !== "function" || typeof validation.validateKycDecisionPayload !== "function") {
      throw new Error("FAIL: Validation functions missing!")
    }
    console.log("  ✓ Admin Validation Schemas export verified.")

    // 2. Data Repositories
    const repository = require("@/lib/admin/adminRepository")
    if (typeof repository.fetchPaginatedAdminUsersRepo !== "function" || typeof repository.fetchPaginatedAuditLogsRepo !== "function") {
      throw new Error("FAIL: Repository functions missing!")
    }
    console.log("  ✓ Admin Data Repositories export verified.")

    // 3. Business Services
    const service = require("@/lib/admin/adminService")
    if (typeof service.executeUserStatusMutationService !== "function" || typeof service.executeKycComplianceDecisionService !== "function") {
      throw new Error("FAIL: Business Service functions missing!")
    }
    console.log("  ✓ Admin Business Services export verified.")

    // 4. API Client
    const apiClient = require("@/services/adminApiClient")
    if (typeof apiClient.fetchAdminStatsApi !== "function" || typeof apiClient.executeKycDecisionApi !== "function") {
      throw new Error("FAIL: Frontend API Client functions missing!")
    }
    console.log("  ✓ Frontend Admin API Client export verified.")

    console.log("\n==================================================")
    console.log("   🎉 MODULAR ADMIN ARCHITECTURE TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ MODULAR ARCHITECTURE TEST FAILED:", err)
    process.exit(1)
  }
}

testAdminModularArchitecture()
