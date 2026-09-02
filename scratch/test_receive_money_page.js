require("dotenv").config()
const fs = require("fs")

function testReceiveMoneyPage() {
  console.log("==================================================")
  console.log("   DEDICATED RECEIVE MONEY PAGE AUDIT             ")
  console.log("==================================================\n")

  try {
    const pageFile = "src/app/receive/page.tsx"
    const layoutFile = "src/components/layout/DashboardLayout.tsx"

    if (!fs.existsSync(pageFile) || !fs.existsSync(layoutFile)) {
      throw new Error("FAIL: Missing required source files for Receive Money page!")
    }

    const pageContent = fs.readFileSync(pageFile, "utf8")
    const layoutContent = fs.readFileSync(layoutFile, "utf8")

    const hasBankSpaceOption = pageContent.includes("Receive from BankSpace") && pageContent.includes("Your BankSpace Account Number")
    const hasOtherBanksOption = pageContent.includes("Receive from Other Banks") && pageContent.includes("Wema Bank")
    const hasExplanationBanner = pageContent.includes("Use your BankSpace account number for transfers from other BankSpace users") && pageContent.includes("Use your dedicated bank account details when receiving money from another bank")
    const hasCopyAndShare = pageContent.includes("Copy Account Number") && pageContent.includes("handleShareDetails")
    const hasRequeryIntegration = pageContent.includes("/api/accounts/virtual/requery")
    const hasNavigationLink = layoutContent.includes("href: \"/receive\"") && layoutContent.includes("Receive Money")

    console.log(`  ✓ Receive Money Page Verified: ${pageFile}`)
    console.log(`  ✓ BankSpace User (P2P) Option Displayed: ${hasBankSpaceOption}`)
    console.log(`  ✓ Other Banks (External DVA) Option Displayed: ${hasOtherBanksOption}`)
    console.log(`  ✓ Mandatory Explanation Callout Banner Present: ${hasExplanationBanner}`)
    console.log(`  ✓ Copy & Share Action Handlers Present: ${hasCopyAndShare}`)
    console.log(`  ✓ Transfer Requery Integration (/api/accounts/virtual/requery): ${hasRequeryIntegration}`)
    console.log(`  ✓ Dashboard Navigation Item Link Present: ${hasNavigationLink}`)

    if (!hasBankSpaceOption || !hasOtherBanksOption || !hasExplanationBanner || !hasCopyAndShare || !hasRequeryIntegration || !hasNavigationLink) {
      throw new Error("FAIL: Dedicated Receive Money page audit failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 DEDICATED RECEIVE MONEY PAGE VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ RECEIVE MONEY PAGE AUDIT FAILED:", err)
    process.exit(1)
  }
}

testReceiveMoneyPage()
