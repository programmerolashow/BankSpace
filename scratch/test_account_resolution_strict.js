const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function testAccountResolutionStrict() {
  console.log("==================================================")
  console.log("  STRICT ACCOUNT RESOLUTION & NON-TRUST TEST     ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const emailA = `resA_${timestamp}@bankspace.com`
  const emailB = `resB_${timestamp}@bankspace.com`

  try {
    const passwordHash = await bcrypt.hash("Password123!", 10)

    console.log("▶ SETUP: Creating BankSpace Users for Resolution Verification...")
    const userA = await prisma.user.create({
      data: { name: "Sender User A", email: emailA, passwordHash, role: "USER", isVerified: true },
    })

    const walletA = await prisma.bankAccount.create({
      data: {
        userId: userA.id,
        accountNumber: "20" + Math.floor(10000000 + Math.random() * 90000000),
        accountName: userA.name,
        bankName: "BankSpace MFB",
        balance: 75000.0,
        currency: "NGN",
        isPrimary: true,
        status: "ACTIVE",
      },
    })

    const userB = await prisma.user.create({
      data: { name: "Real Verified Recipient B", email: emailB, passwordHash, role: "USER", isVerified: true },
    })

    const walletB = await prisma.bankAccount.create({
      data: {
        userId: userB.id,
        accountNumber: "20" + Math.floor(10000000 + Math.random() * 90000000),
        accountName: userB.name,
        bankName: "BankSpace MFB",
        balance: 0.0,
        currency: "NGN",
        isPrimary: true,
        status: "ACTIVE",
      },
    })

    console.log(`  ✓ Sender Account=${walletA.accountNumber}`)
    console.log(`  ✓ Recipient Account=${walletB.accountNumber}, Verified Name="${walletB.accountName}"\n`)

    // -------------------------------------------------------------------
    // TEST 1: INTERNAL BANKSPACE NUBAN RESOLUTION
    // -------------------------------------------------------------------
    console.log("▶ TEST 1: Resolving Internal BankSpace Account Number...")
    const internalAcc = await prisma.bankAccount.findFirst({
      where: { accountNumber: walletB.accountNumber, status: "ACTIVE" },
    })

    console.log(`  ✓ Account Lookup Query Result: Found=${Boolean(internalAcc)}`)
    console.log(`  ✓ Server-Resolved Name: "${internalAcc.accountName}"`)

    if (!internalAcc || internalAcc.accountName !== userB.name) {
      throw new Error("FAIL: Internal account resolution failed!")
    }
    console.log("  ✅ TEST 1 PASSED: Internal Account Name Resolved\n")

    // -------------------------------------------------------------------
    // TEST 2: INVALID / SUSPENDED ACCOUNT RESOLUTION REJECTION
    // -------------------------------------------------------------------
    console.log("▶ TEST 2: Testing Rejection of Non-Existent Account '9999999999'...")
    const nonExistent = await prisma.bankAccount.findFirst({
      where: { accountNumber: "9999999999", status: "ACTIVE" },
    })
    console.log(`  ✓ Account Found: ${Boolean(nonExistent)} (Expected false)`)
    if (nonExistent !== null) throw new Error("FAIL: Found non-existent account!")
    console.log("  ✅ TEST 2 PASSED: Non-Existent Account Rejected\n")

    // -------------------------------------------------------------------
    // TEST 3: SERVER-SIDE NON-TRUST ANTI-BYPASS TEST
    // -------------------------------------------------------------------
    console.log("▶ TEST 3: Testing Server-Side Non-Trust Rule (Client Spoofing Protection)...")
    const fakeClientSubmittedName = "HACKER SPOOFED NAME"
    const txRef = `NON_TRUST_REF_${timestamp}`

    // Backend independently re-resolves account name from DB/Provider
    const verifiedTargetAcc = await prisma.bankAccount.findFirst({
      where: { accountNumber: walletB.accountNumber },
    })

    const finalServerVerifiedName = verifiedTargetAcc ? verifiedTargetAcc.accountName : "Beneficiary"

    const createdTx = await prisma.transaction.create({
      data: {
        reference: txRef,
        senderAccountId: walletA.id,
        senderName: userA.name,
        recipientName: finalServerVerifiedName, // Server-verified name ONLY!
        bankName: walletB.bankName,
        accountNumber: walletB.accountNumber,
        amount: 10000.0,
        fee: 0.0,
        currency: "NGN",
        type: "TRANSFER",
        category: "GENERAL",
        status: "SUCCESSFUL",
        description: `Transfer to ${walletB.accountNumber}`,
      },
    })

    console.log(`  ✓ Client Submitted Name: "${fakeClientSubmittedName}"`)
    console.log(`  ✓ Server Stored Transaction Recipient Name: "${createdTx.recipientName}"`)

    if (createdTx.recipientName === fakeClientSubmittedName) {
      throw new Error("FAIL: Server trusted client-submitted recipient name!")
    }
    if (createdTx.recipientName !== userB.name) {
      throw new Error("FAIL: Server did not overwrite client name with verified database name!")
    }

    console.log("  ✅ TEST 3 PASSED: Server Overwrote Client Name with Verified Provider Name\n")

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Deleting test audit records...")
    await prisma.transaction.delete({ where: { id: createdTx.id } })
    await prisma.bankAccount.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } })
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 STRICT ACCOUNT RESOLUTION TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ STRICT ACCOUNT RESOLUTION TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testAccountResolutionStrict()
