const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function testP2PMultiIdentifier() {
  console.log("==================================================")
  console.log("   MULTI-IDENTIFIER P2P RECONCILIATION TEST      ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const emailA = `multiA_${timestamp}@bankspace.com`
  const emailB = `multiB_${timestamp}@bankspace.com`
  const phoneB = `+23480${Math.floor(10000000 + Math.random() * 90000000)}`

  try {
    const passwordHash = await bcrypt.hash("Password123!", 10)

    console.log("▶ SETUP: Creating Sender User A (₦100,000) & Recipient User B (₦0.00)...")
    const userA = await prisma.user.create({
      data: { name: "Sender User A", email: emailA, passwordHash, role: "USER", isVerified: true },
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
      data: { name: "Recipient User B", email: emailB, phone: phoneB, passwordHash, role: "USER", isVerified: true },
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
    console.log(`  ✓ Recipient Account=${walletB.accountNumber}, Email=${userB.email}, Phone=${userB.phone}, Initial Balance=₦${walletB.balance.toLocaleString()}.00\n`)

    // -------------------------------------------------------------------
    // TEST 1: IDENTIFIER RESOLUTION BY EMAIL
    // -------------------------------------------------------------------
    console.log("▶ TEST 1: Testing Recipient Resolution by Email...")
    const resolvedByEmail = await prisma.user.findFirst({
      where: { email: { equals: emailB, mode: "insensitive" } },
      include: { bankAccounts: true },
    })

    console.log(`  ✓ Resolved Account via Email '${emailB}': Number=${resolvedByEmail.bankAccounts[0].accountNumber}, Name="${resolvedByEmail.name}"`)
    if (!resolvedByEmail || resolvedByEmail.bankAccounts[0].id !== walletB.id) {
      throw new Error("FAIL: Resolution by email failed!")
    }
    console.log("  ✅ TEST 1 PASSED: Email Identifier Resolved\n")

    // -------------------------------------------------------------------
    // TEST 2: IDENTIFIER RESOLUTION BY PHONE
    // -------------------------------------------------------------------
    console.log("▶ TEST 2: Testing Recipient Resolution by Phone Number...")
    const resolvedByPhone = await prisma.user.findFirst({
      where: { phone: phoneB },
      include: { bankAccounts: true },
    })

    console.log(`  ✓ Resolved Account via Phone '${phoneB}': Number=${resolvedByPhone.bankAccounts[0].accountNumber}`)
    if (!resolvedByPhone || resolvedByPhone.bankAccounts[0].id !== walletB.id) {
      throw new Error("FAIL: Resolution by phone failed!")
    }
    console.log("  ✅ TEST 2 PASSED: Phone Identifier Resolved\n")

    // -------------------------------------------------------------------
    // TEST 3: EXECUTE RECONCILED DUAL-TRANSACTION P2P TRANSFER (₦20,000)
    // -------------------------------------------------------------------
    console.log("▶ TEST 3: Executing Reconciled Dual-Transaction P2P Transfer (₦20,000)...")
    const transferAmount = 20000.0
    const txRef = `RECONCILED_P2P_${timestamp}`

    const senderTx = await prisma.$transaction(async (tx) => {
      // 1. Sender Outbound Transaction Record (DEBIT)
      const stx = await tx.transaction.create({
        data: {
          reference: txRef,
          senderAccountId: walletA.id,
          recipientAccountId: walletB.id,
          senderName: userA.name,
          recipientName: userB.name,
          bankName: "BankSpace MFB",
          accountNumber: walletB.accountNumber,
          amount: transferAmount,
          fee: 0.0,
          currency: "NGN",
          type: "TRANSFER",
          category: "GENERAL",
          status: "SUCCESSFUL",
          description: `Transfer of ₦${transferAmount.toLocaleString()} to ${userB.name}`,
        },
      })

      // 2. Recipient Inbound Transaction Record (CREDIT)
      await tx.transaction.create({
        data: {
          reference: `${txRef}_REC`,
          senderAccountId: walletA.id,
          recipientAccountId: walletB.id,
          senderName: userA.name,
          recipientName: userB.name,
          bankName: "BankSpace MFB",
          accountNumber: walletB.accountNumber,
          amount: transferAmount,
          fee: 0.0,
          currency: "NGN",
          type: "TRANSFER",
          category: "TRANSFER_RECEIVED",
          status: "SUCCESSFUL",
          description: `Transfer of ₦${transferAmount.toLocaleString()} received from ${userA.name}`,
        },
      })

      // 3. Debit Sender Balance
      await tx.bankAccount.update({ where: { id: walletA.id }, data: { balance: { decrement: transferAmount } } })
      const updatedA = await tx.bankAccount.findUnique({ where: { id: walletA.id } })

      // 4. Sender DEBIT Ledger Entry
      await tx.ledgerEntry.create({
        data: {
          transactionId: stx.id,
          bankAccountId: walletA.id,
          entryType: "DEBIT",
          amount: transferAmount,
          balanceAfter: updatedA.balance,
        },
      })

      // 5. Credit Recipient Balance
      await tx.bankAccount.update({ where: { id: walletB.id }, data: { balance: { increment: transferAmount } } })
      const updatedB = await tx.bankAccount.findUnique({ where: { id: walletB.id } })

      // 6. Recipient CREDIT Ledger Entry
      await tx.ledgerEntry.create({
        data: {
          transactionId: stx.id,
          bankAccountId: walletB.id,
          entryType: "CREDIT",
          amount: transferAmount,
          balanceAfter: updatedB.balance,
        },
      })

      return stx
    })

    // Dual Notifications
    await prisma.notification.create({
      data: { userId: userA.id, title: "Transfer Successful ↗️", message: `Sent ₦20,000 to ${userB.name}`, type: "SUCCESS" },
    })
    await prisma.notification.create({
      data: { userId: userB.id, title: "Account Credited ↘️", message: `Received ₦20,000 from ${userA.name}`, type: "SUCCESS" },
    })

    // -------------------------------------------------------------------
    // TEST 4: AUDIT RECONCILIATION & DUAL LEDGER ENTRIES
    // -------------------------------------------------------------------
    console.log("▶ TEST 4: Auditing Double-Entry Accounting & Dual Notifications...")
    const finalWalletA = await prisma.bankAccount.findUnique({ where: { id: walletA.id } })
    const finalWalletB = await prisma.bankAccount.findUnique({ where: { id: walletB.id } })

    console.log(`  ✓ Sender Final Balance: ₦${finalWalletA.balance.toLocaleString()}.00 (Expected ₦80,000.00)`)
    console.log(`  ✓ Recipient Final Balance: ₦${finalWalletB.balance.toLocaleString()}.00 (Expected ₦20,000.00)`)

    if (finalWalletA.balance !== 80000.0 || finalWalletB.balance !== 20000.0) {
      throw new Error("FAIL: Wallet balance reconciliation mismatch!")
    }

    const txRecords = await prisma.transaction.findMany({
      where: { OR: [{ reference: txRef }, { reference: `${txRef}_REC` }] },
    })
    console.log(`  ✓ Reconciled Dual Transaction Records Created: ${txRecords.length} (Sender Outbound + Recipient Inbound)`)
    txRecords.forEach((t) => console.log(`    • Tx: Ref=${t.reference} | Type=${t.type} | Cat=${t.category} | Amount=₦${t.amount.toLocaleString()}.00`))

    if (txRecords.length !== 2) throw new Error("FAIL: Dual transaction records missing!")

    const notifications = await prisma.notification.findMany({
      where: { userId: { in: [userA.id, userB.id] } },
    })
    console.log(`  ✓ Dual Settlement Notifications Dispatched: ${notifications.length}`)
    notifications.forEach((n) => console.log(`    • Notif: User=${n.userId === userA.id ? "Sender" : "Recipient"} | Title="${n.title}"`))

    if (notifications.length !== 2) throw new Error("FAIL: Dual notifications missing!")
    console.log("  ✅ TEST 4 PASSED: Reconciled Accounting & Dual Notifications Verified\n")

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Deleting test audit records...")
    await prisma.ledgerEntry.deleteMany({ where: { transactionId: senderTx.id } })
    await prisma.transaction.deleteMany({ where: { OR: [{ reference: txRef }, { reference: `${txRef}_REC` }] } })
    await prisma.notification.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } })
    await prisma.bankAccount.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } })
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 MULTI-IDENTIFIER P2P TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ MULTI-IDENTIFIER TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testP2PMultiIdentifier()
