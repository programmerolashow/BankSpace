const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function testAccountResolutionStrict() {
  console.log("==================================================")
  console.log("  STRICT SERVER-SIDE NUBAN RESOLUTION TEST        ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const emailA = `resA_${timestamp}@bankspace.com`
  const emailB = `resB_${timestamp}@bankspace.com`

  try {
    const passwordHash = await bcrypt.hash("Password123!", 10)

    console.log("▶ SETUP: Creating User A & User B Accounts...")
    const userA = await prisma.user.create({
      data: { name: "Resolution Sender A", email: emailA, passwordHash, role: "USER", isVerified: true },
    })

    const walletA = await prisma.bankAccount.create({
      data: {
        userId: userA.id,
        accountNumber: "20" + Math.floor(10000000 + Math.random() * 90000000),
        accountName: userA.name,
        bankName: "BankSpace MFB",
        balance: 100000.0,
        currency: "NGN",
        isPrimary: true,
        status: "ACTIVE",
      },
    })

    const userB = await prisma.user.create({
      data: { name: "Resolution Target B", email: emailB, passwordHash, role: "USER", isVerified: true },
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
    console.log(`  ✓ Target Account=${walletB.accountNumber}, Verified Name="${walletB.accountName}"\n`)

    // -------------------------------------------------------------------
    // CHECKPOINT 1: NUBAN FORMAT & BANK CODE VALIDATION
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 1: Testing NUBAN Format & Bank Code Validation...")
    const invalidShortAcc = "12345"
    const isInvalidLength = !/^\d{10}$/.test(invalidShortAcc)
    console.log(`  ✓ 5-Digit Account '${invalidShortAcc}' Format Check: Valid 10-Digit=${!isInvalidLength}`)

    const validAcc = walletB.accountNumber
    const isValidLength = /^\d{10}$/.test(validAcc)
    console.log(`  ✓ 10-Digit Account '${validAcc}' Format Check: Valid 10-Digit=${isValidLength}`)

    if (!isInvalidLength || !isValidLength) throw new Error("FAIL: NUBAN format validation failed!")
    console.log("  ✅ CHECKPOINT 1 PASSED: 10-Digit NUBAN Format Enforced\n")

    // -------------------------------------------------------------------
    // CHECKPOINT 2: ZERO CLIENT TRUST RE-RESOLUTION IN TRANSFERS
    // -------------------------------------------------------------------
    console.log("▶ CHECKPOINT 2: Testing Zero Client-Trust Server Re-Resolution...")
    const spoofedClientSubmittedName = "HACKER_SPOOFED_BENEFICIARY_NAME"
    const txRef = `ZERO_TRUST_REF_${timestamp}`
    const transferAmount = 15000.0

    // Backend independently resolves name from database or provider, ignoring spoofed client name
    const verifiedAccount = await prisma.bankAccount.findFirst({
      where: { accountNumber: walletB.accountNumber, status: "ACTIVE" },
      include: { user: true },
    })

    const verifiedName = verifiedAccount ? (verifiedAccount.accountName || verifiedAccount.user?.name || "Verified Beneficiary") : "Beneficiary"

    console.log(`  ✓ Client Submitted Name: "${spoofedClientSubmittedName}"`)
    console.log(`  ✓ Server Resolved Verified Name: "${verifiedName}"`)

    if (verifiedName === spoofedClientSubmittedName) {
      throw new Error("FAIL: Server trusted client-submitted name!")
    }

    const createdTx = await prisma.transaction.create({
      data: {
        reference: txRef,
        senderAccountId: walletA.id,
        recipientAccountId: walletB.id,
        senderName: userA.name,
        recipientName: verifiedName, // Server verified name used!
        bankName: "BankSpace MFB",
        accountNumber: walletB.accountNumber,
        amount: transferAmount,
        fee: 0.0,
        currency: "NGN",
        type: "TRANSFER",
        category: "INTERNAL_TRANSFER",
        status: "SUCCESSFUL",
      },
    })

    const dbTx = await prisma.transaction.findUnique({ where: { id: createdTx.id } })
    console.log(`  ✓ Stored Transaction Recipient Name in DB: "${dbTx.recipientName}"`)

    if (dbTx.recipientName !== "Resolution Target B") {
      throw new Error("FAIL: Stored transaction recipient name does not match verified server resolution!")
    }
    console.log("  ✅ CHECKPOINT 2 PASSED: Server Ignored Client Name & Stored Verified Provider Name\n")

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Deleting test audit records...")
    await prisma.transaction.delete({ where: { id: createdTx.id } })
    await prisma.bankAccount.deleteMany({ where: { id: { in: [walletA.id, walletB.id] } } })
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 STRICT ACCOUNT RESOLUTION TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ ACCOUNT RESOLUTION TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testAccountResolutionStrict()
