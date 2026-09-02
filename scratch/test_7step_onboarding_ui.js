require("dotenv").config()
const fs = require("fs")

function test7StepOnboardingUi() {
  console.log("==================================================")
  console.log("   7-STEP FINTECH ONBOARDING STEPPER AUDIT       ")
  console.log("==================================================\n")

  try {
    const pageFile = "src/app/complete-profile/page.tsx"
    if (!fs.existsSync(pageFile)) {
      throw new Error(`FAIL: Missing onboarding page file: ${pageFile}`)
    }

    const content = fs.readFileSync(pageFile, "utf8")

    const hasStep1 = content.includes("Step 1 — Personal Information") && content.includes("First Name") && content.includes("Date of Birth")
    const hasStep2 = content.includes("Step 2 — Phone Verification") && content.includes("Send OTP") && content.includes("Verify OTP")
    const hasStep3 = content.includes("Step 3 — Identity") && content.includes("11-Digit BVN") && content.includes("11-Digit NIN")
    const hasStep4 = content.includes("Step 4 — Residential Address") && content.includes("Street Address") && content.includes("LGA")
    const hasStep5 = content.includes("Step 5 — Verification Processing") && content.includes("Verifying your information...")
    const hasStep6 = content.includes("Step 6 — BankSpace Account Ready") && content.includes("BankSpace Account Number")
    const hasStep7 = content.includes("Step 7 — Dedicated Receiving Account") && content.includes("Receiving Account Details") && content.includes("Go to BankSpace Dashboard")

    console.log(`  ✓ Step 1 (Personal Information): ${hasStep1}`)
    console.log(`  ✓ Step 2 (Phone Verification & OTP): ${hasStep2}`)
    console.log(`  ✓ Step 3 (Identity BVN & NIN): ${hasStep3}`)
    console.log(`  ✓ Step 4 (Residential Address): ${hasStep4}`)
    console.log(`  ✓ Step 5 (Verification Processing): ${hasStep5}`)
    console.log(`  ✓ Step 6 (BankSpace Account Ready): ${hasStep6}`)
    console.log(`  ✓ Step 7 (Dedicated Receiving Account): ${hasStep7}`)

    if (!hasStep1 || !hasStep2 || !hasStep3 || !hasStep4 || !hasStep5 || !hasStep6 || !hasStep7) {
      throw new Error("FAIL: 7-Step Onboarding Stepper audit failed!")
    }

    console.log("\n==================================================")
    console.log("   🎉 7-STEP FINTECH ONBOARDING STEPPER VERIFIED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ 7-STEP ONBOARDING AUDIT FAILED:", err)
    process.exit(1)
  }
}

test7StepOnboardingUi()
