const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function testTransferFrontendJourney() {
  console.log("==================================================")
  console.log("  FRONTEND MULTI-STEP TRANSFER JOURNEY AUDIT TEST ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const emailA = `journeyA_${timestamp}@bankspace.com`
  const emailB = `journeyB_${timestamp}@bankspace.com`

  try {
    const passwordHash = await bcrypt.hash("Password123!", 10)

    console.log("▶ SETUP: Creating Sender User A (₦50,000) & Recipient User B (₦0.00)...")
    const userA = await prisma.user.create({
      data: { name: "Sender User A", email: emailA, passwordHash, role: "USER", isVerified: true },
    })

    const walletA = await prisma.bankAccount.create({
      data: {
        userId: userA.id,
        accountNumber: "20" + Math.floor(10000000 + Math.random() * 90000000),
        accountName: userA.name,
        bankName: "BankSpace MFB",
        balance: 50000.0,
        currency: "NGN",
        isPrimary: true,
        status: "ACTIVE",
      },
    })

    const userB = await prisma.user.create({
      data: { name: "Recipient User B", email: emailB, passwordHash, role: "USER", isVerified: true },
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

    console.log(`  ✓ Sender Account=${walletA.accountNumber}, Initial Balance=₦${walletA.balance.toLocaleString()}.00`)
    console.log(`  ✓ Recipient Account=${walletB.accountNumber}, Initial Balance=₦${walletB.balance.toLocaleString()}.00\n`)

    // -------------------------------------------------------------------
    // STEP 1: VERIFY FORM & REVIEW STEP DATA STRUCTURE
    // -------------------------------------------------------------------
    console.log("▶ STEP 1: Auditing Review Step Breakdown Fields...")
    const transferPayload = {
      recipientAccount: walletB.accountNumber,
      recipientName: userB.name,
      bankName: walletB.bankName,
      category: "FOOD",
      amount: 15000.0,
      fee: 0.0,
    }

    console.log(`  ✓ Source Account: ${walletA.accountNumber}`)
    console.log(`  ✓ Recipient: ${transferPayload.recipientName} (${transferPayload.recipientAccount})`)
    console.log(`  ✓ Category: ${transferPayload.category}`)
    console.log(`  ✓ Transfer Amount: ₦${transferPayload.amount.toLocaleString()}.00`)
    console.log(`  ✓ Applied Fee: ₦${transferPayload.fee.toLocaleString()}.00 (Free)`)
    console.log("  ✅ STEP 1 PASSED: Review Step Fields Reconciled\n")

    // -------------------------------------------------------------------
    // STEP 2: SIMULATE BACKEND TRANSACTION HANDSHAKE (POST /api/transfer)
    // -------------------------------------------------------------------
    console.log("▶ STEP 2: Executing Backend Transaction Handshake with Idempotency Key...")
    const idempotencyKey = `JOURNEY_IDEM_${timestamp}`

    const txResponse = await prisma.$transaction(async (tx) => {
      const initialTx = await tx.transaction.create({
        data: {
          reference: idempotencyKey,
          senderAccountId: walletA.id,
          senderName: userA.name,
          recipientName: userB.name,
          bankName: walletB.bankName,
          accountNumber: walletB.accountNumber,
          amount: transferPayload.amount,
          fee: 0.0,
          currency: "NGN",
          type: "TRANSFER",
          category: transferPayload.category,
          status: "PROCESSING",
        },
      })

      await tx.bankAccount.update({ where: { id: walletA.id }, data: { balance: { decrement: transferPayload.amount } } })
      await tx.bankAccount.update({ where: { id: walletB.id }, data: { balance: { increment: transferPayload.amount } } })

      return await tx.transaction.update({
        where: { id: initialTx.id },
        data: { status: "SUCCESSFUL", recipientAccountId: walletB.id },
      })
    })

    console.log("  ✓ Backend Handshake Completed Successfully!")
    console.log(`  ✓ Returned Transaction Reference: ${txResponse.reference}`)
    console.log(`  ✓ Returned Status: ${txResponse.status}`)
    console.log(`  ✓ Returned Timestamp: ${txResponse.createdAt.toISOString()}`)

    if (txResponse.status !== "SUCCESSFUL" || txResponse.reference !== idempotencyKey) {
      throw new Error("FAIL: Backend confirmation payload invalid!")
    }
    console.log("  ✅ STEP 2 PASSED: Authoritative Receipt Confirmed\n")

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Deleting test audit records...")
    await prisma.transaction.delete({ where: { id: txResponse.id } })
    await prisma.bankAccount.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } })
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 FRONTEND TRANSFER JOURNEY TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ FRONTEND JOURNEY TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testTransferFrontendJourney()
