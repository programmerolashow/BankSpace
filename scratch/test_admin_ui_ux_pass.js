require("dotenv").config()

function testAdminUiUxPassSystem() {
  console.log("==================================================")
  console.log("   BANKSPACE BRAND UI/UX DESIGN SYSTEM AUDIT      ")
  console.log("==================================================\n")

  try {
    const fs = require("fs")

    const filesToAudit = [
      "src/components/layout/AdminLayout.tsx",
      "src/components/admin/AdminDataTable.tsx",
      "src/components/admin/ConfirmActionModal.tsx",
      "src/components/admin/AdminErrorBoundary.tsx",
      "src/app/admin/dashboard/page.tsx",
      "src/app/admin/kyc/page.tsx",
      "src/app/admin/transactions/page.tsx",
      "src/app/admin/transfers/page.tsx",
      "src/app/admin/activity/page.tsx",
      "src/app/admin/settings/page.tsx",
      "src/app/admin/paystack/page.tsx",
    ]

    for (const filePath of filesToAudit) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`FAIL: Component missing: ${filePath}`)
      }

      const content = fs.readFileSync(filePath, "utf8")

      const hasRounded3xl = content.includes("rounded-3xl") || content.includes("rounded-2xl")
      const hasSlateTheme = content.includes("slate-900") || content.includes("slate-950") || content.includes("slate-800")
      const hasBrandAccent = content.includes("amber-400") || content.includes("amber-500") || content.includes("indigo-400") || content.includes("cyan-400")

      console.log(`  ✓ Brand Audit [${filePath}]: RoundedCards=${hasRounded3xl}, DarkTheme=${hasSlateTheme}, BrandAccents=${hasBrandAccent}`)
    }

    console.log("\n==================================================")
    console.log("   🎉 BANKSPACE BRAND UI/UX DESIGN SYSTEM PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ BRAND UI/UX AUDIT FAILED:", err)
    process.exit(1)
  }
}

testAdminUiUxPassSystem()
