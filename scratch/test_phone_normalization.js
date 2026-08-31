const { normalizePhoneNumberToAccountNumber } = require("../src/lib/phoneNormalization")

function runPhoneNormalizationTests() {
  console.log("==================================================")
  console.log("   PHONE NORMALIZATION UNIT TEST SUITE            ")
  console.log("==================================================\n")

  const testCases = [
    { input: "08012345678", expected: "8012345678" },
    { input: "+2348012345678", expected: "8012345678" },
    { input: "2348012345678", expected: "8012345678" },
    { input: "8012345678", expected: "8012345678" },
    { input: "+234 801 234 5678", expected: "8012345678" },
    { input: "07098765432", expected: "7098765432" },
    { input: "+234 901 111 2233", expected: "9011112233" },
  ]

  let passedCount = 0

  for (const tc of testCases) {
    const actual = normalizePhoneNumberToAccountNumber(tc.input)
    const passed = actual === tc.expected && actual.length === 10
    console.log(`  Input: "${tc.input}" -> Actual: "${actual}" | Expected: "${tc.expected}" => ${passed ? "✓ PASS" : "❌ FAIL"}`)
    if (passed) passedCount++
  }

  console.log(`\nResults: ${passedCount}/${testCases.length} Passed.`)

  if (passedCount !== testCases.length) {
    throw new Error("FAIL: Phone normalization tests failed!")
  }
}

runPhoneNormalizationTests()
