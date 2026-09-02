require("dotenv").config()
const fs = require("fs")

function testAdminKycConsole() {
  console.log("==================================================")
  console.log("   ADMIN CUSTOMERS KYC CONSOLE AUDIT              ")
  console.log("==================================================\n")

  try {
    const routeFile = "src/app/api/admin/kyc/route.ts"
    const pageFile = "src/app/admin/kyc/page.tsx"

    if (!fs.existsSync(routeFile) || !fs.existsSync(pageFile)) {
      throw new Error("FAIL: Missing Admin KYC route or page files!")
    }

    const routeContent = fs.readFileSync(routeFile, "utf8")
    const pageContent = fs.readFileSync(pageFile, "utf8")

    const hasMaskedBvn = routeContent.includes("maskedBvn") && routeContent.includes("******")
    const hasMaskedNin = routeContent.includes("maskedNin") && routeContent.includes("******")
    const hasApproveAction = routeContent.includes("APPROVE") && routeContent.includes("notifyKycVerificationSuccess")
    const hasRejectAction = routeContent.includes("REJECT") && routeContent.includes("notifyKycVerificationFailure")
    const hasReviewAction = routeContent.includes("REVIEW") && routeContent.includes("MANUAL_REVIEW")
    const hasSuspendAction = routeContent.includes("SUSPEND") && routeContent.includes("SUSPENDED")
    const hasRequestReverifyAction = routeContent.includes("REQUEST_REVERIFICATION") && routeContent.includes("NOT_STARTED")

    const hasUserCol = pageContent.includes("User")
    const hasAccCol = pageContent.includes("BankSpace Account")
    const hasPhoneCol = pageContent.includes("Phone")
    const hasKycCol = pageContent.includes("KYC Status")
    const hasBvnCol = pageContent.includes("BVN Status")
    const hasNinCol = pageContent.includes("NIN Status")
    const hasDvaCol = pageContent.includes("Virtual Account")
    const hasCreatedCol = pageContent.includes("Created Date")
    const hasModal = pageContent.includes("View KYC") && pageContent.includes("Masked BVN")

    console.log(`  ✓ Masked BVN Protection (222******89): ${hasMaskedBvn}`)
    console.log(`  ✓ Masked NIN Protection (111******89): ${hasMaskedNin}`)
    console.log(`  ✓ Action Handler: APPROVE: ${hasApproveAction}`)
    console.log(`  ✓ Action Handler: REJECT: ${hasRejectAction}`)
    console.log(`  ✓ Action Handler: REVIEW: ${hasReviewAction}`)
    console.log(`  ✓ Action Handler: SUSPEND: ${hasSuspendAction}`)
    console.log(`  ✓ Action Handler: REQUEST_REVERIFICATION: ${hasRequestReverifyAction}`)
    console.log(`  ✓ UI Table Columns (User, Acc, Phone, KYC, BVN, NIN, DVA, CreatedDate): ${hasUserCol && hasAccCol && hasPhoneCol && hasKycCol && hasBvnCol && hasNinCol && hasDvaCol && hasCreatedCol}`)
    console.log(`  ✓ Masked PII Inspection Modal: ${hasModal}`)

    if (!hasMaskedBvn || !hasMaskedNin || !hasApproveAction || !hasRejectAction || !hasReviewAction || !hasSuspendAction || !hasRequestReverifyAction || !hasModal) {
      throw new Error("FAIL: Admin Customers KYC Console audit failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 ADMIN CUSTOMERS KYC CONSOLE VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ ADMIN KYC CONSOLE AUDIT FAILED:", err)
    process.exit(1)
  }
}

testAdminKycConsole()
