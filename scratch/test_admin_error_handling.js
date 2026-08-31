require("dotenv").config()

async function testAdminErrorHandlingSubsystem() {
  console.log("==================================================")
  console.log("   ADMIN UNIFIED ERROR HANDLING TEST SUITE        ")
  console.log("==================================================\n")

  try {
    // 1. Server API Error Helper Sanitization
    const { apiInternalError, apiUnauthorized, apiForbidden } = require("@/lib/errors")
    const errRes = apiInternalError(new Error("SECRET DB PASS: postgres://user:secret@localhost/db"))
    const errJson = await errRes.json()

    console.log(`  ✓ Internal Error Message: "${errJson.message}"`)
    console.log(`  ✓ Internal Error Code: "${errJson.code}"`)

    if (JSON.stringify(errJson).includes("secret") || errJson.code !== "INTERNAL_ERROR") {
      throw new Error("FAIL: Raw error stack trace or secret was leaked in response!")
    }
    console.log("  ✅ Server Error Traceback Masking Verified.\n")

    // 2. Frontend Error Parser
    const { parseAdminApiError } = require("@/lib/admin/adminErrorHandler")

    const mockResponse401 = new Response(JSON.stringify({ message: "Auth required", code: "UNAUTHORIZED" }), { status: 401 })
    const parsed401 = await parseAdminApiError(mockResponse401)
    console.log(`  ✓ 401 Error Parsed: IsAuthError=${parsed401.isAuthError}, Message="${parsed401.message}"`)

    const mockResponse403 = new Response(JSON.stringify({ message: "Admin access required", code: "FORBIDDEN" }), { status: 403 })
    const parsed403 = await parseAdminApiError(mockResponse403)
    console.log(`  ✓ 403 Error Parsed: IsPermissionError=${parsed403.isPermissionError}, Message="${parsed403.message}"`)

    const mockNetworkErr = new TypeError("Failed to fetch")
    const parsedNet = await parseAdminApiError(mockNetworkErr)
    console.log(`  ✓ Network Error Parsed: IsNetworkError=${parsedNet.isNetworkError}, Message="${parsedNet.message}"`)

    if (!parsed401.isAuthError || !parsed403.isPermissionError || !parsedNet.isNetworkError) {
      throw new Error("FAIL: Error parser status code mapping failed!")
    }
    console.log("  ✅ Frontend Error Parser Verified.\n")

    // 3. React Error Boundary Export
    const { AdminErrorBoundary } = require("@/components/admin/AdminErrorBoundary")
    if (!AdminErrorBoundary || typeof AdminErrorBoundary !== "function") {
      throw new Error("FAIL: AdminErrorBoundary component is missing!")
    }
    console.log("  ✓ AdminErrorBoundary React Component export verified.")

    console.log("\n==================================================")
    console.log("   🎉 UNIFIED ERROR HANDLING TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ UNIFIED ERROR HANDLING TEST FAILED:", err)
    process.exit(1)
  }
}

testAdminErrorHandlingSubsystem()
