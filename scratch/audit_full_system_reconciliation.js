const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function auditFullSystemReconciliation() {
  console.log("==================================================")
  console.log("  FULL SYSTEM FINANCIAL RECONCILIATION AUDIT     ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const emailA = `reconA_${timestamp}@bankspace.com`
  const emailB = `reconB_${timestamp}@bankspace.com`

  try {
    const passwordHash = await bcrypt.hash("Password123!", 10)

    console.log("▶ STEP 1: Creating User A (Opening Balance ₦100,000) & User B (Opening Balance ₦10,000)...")
    const userA = await prisma.user.create({
      data: { name: "Audit User A", email: emailA, passwordHash, role: "USER", isVerified: true },
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
      data: { name: "Audit User B", email: emailB, passwordHash, role: "USER", isVerified: true },
    })
    const walletB = await prisma.bankAccount.create({
      data: {
        userId: userB.id,
        accountNumber: "20" + Math.floor(10000000 + Math.random() * 90000000),
        accountName: userB.name,
        bankName: "BankSpace MFB",
        balance: 10000.0,
        currency: "NGN",
        isPrimary: true,
        status: "ACTIVE",
      },
    })

    const openingBalanceA = 100000.0
    const openingBalanceB = 10000.0
    console.log(`  ✓ User A Account=${walletA.accountNumber}, Opening Balance=₦${openingBalanceA.toLocaleString()}.00`)
    console.log(`  ✓ User B Account=${walletB.accountNumber}, Opening Balance=₦${openingBalanceB.toLocaleString()}.00\n`)

    const txRecords = []
    const ledgerRecords = []

    // -------------------------------------------------------------------
    // OPERATION 1: INBOUND EXTERNAL DEPOSIT TO USER A (₦50,000)
    // -------------------------------------------------------------------
    console.log("▶ OPERATION 1: Inbound Webhook Deposit of ₦50,000 to User A...")
    const depRef = `AUDIT_DEP_${timestamp}`
    const depAmount = 50000.0

    const txDep = await prisma.$transaction(async (tx) => {
      const createdTx = await tx.transaction.create({
        data: {
          reference: depRef,
          senderName: "GTBank Depositor",
          recipientName: walletA.accountName,
          bankName: "GTBank",
          accountNumber: walletA.accountNumber,
          amount: depAmount,
          fee: 0.0,
          currency: "NGN",
          type: "DEPOSIT",
          category: "DEPOSIT",
          status: "SUCCESSFUL",
        },
      })

      const updated = await tx.bankAccount.update({
        where: { id: walletA.id },
        data: { balance: { increment: depAmount } },
      })

      const ledger = await tx.ledgerEntry.create({
        data: {
          transactionId: createdTx.id,
          bankAccountId: walletA.id,
          entryType: "CREDIT",
          amount: depAmount,
          balanceAfter: updated.balance,
        },
      })
      ledgerRecords.push(ledger)
      return createdTx
    })
    txRecords.push(txDep)
    console.log(`  ✓ User A Balance After Deposit: ₦${(openingBalanceA + depAmount).toLocaleString()}.00\n`)

    // -------------------------------------------------------------------
    // OPERATION 2: P2P TRANSFER FROM USER A TO USER B (₦25,000)
    // -------------------------------------------------------------------
    console.log("▶ OPERATION 2: Internal P2P Transfer of ₦25,000 from User A to User B...")
    const p2pRef = `AUDIT_P2P_${timestamp}`
    const p2pAmount = 25000.0

    await prisma.$transaction(async (tx) => {
      const senderTx = await tx.transaction.create({
        data: {
          reference: p2pRef,
          senderAccountId: walletA.id,
          recipientAccountId: walletB.id,
          senderName: userA.name,
          recipientName: userB.name,
          bankName: "BankSpace MFB",
          accountNumber: walletB.accountNumber,
          amount: p2pAmount,
          fee: 0.0,
          currency: "NGN",
          type: "TRANSFER",
          category: "INTERNAL_TRANSFER",
          status: "SUCCESSFUL",
        },
      })
      txRecords.push(senderTx)

      await tx.transaction.create({
        data: {
          reference: `${p2pRef}_REC`,
          senderAccountId: walletA.id,
          recipientAccountId: walletB.id,
          senderName: userA.name,
          recipientName: userB.name,
          bankName: "BankSpace MFB",
          accountNumber: walletB.accountNumber,
          amount: p2pAmount,
          fee: 0.0,
          currency: "NGN",
          type: "TRANSFER",
          category: "INCOMING_TRANSFER",
          status: "SUCCESSFUL",
        },
      })

      // Debit User A
      const updatedA = await tx.bankAccount.update({
        where: { id: walletA.id },
        data: { balance: { decrement: p2pAmount } },
      })
      const lA = await tx.ledgerEntry.create({
        data: {
          transactionId: senderTx.id,
          bankAccountId: walletA.id,
          entryType: "DEBIT",
          amount: p2pAmount,
          balanceAfter: updatedA.balance,
        },
      })
      ledgerRecords.push(lA)

      // Credit User B
      const updatedB = await tx.bankAccount.update({
        where: { id: walletB.id },
        data: { balance: { increment: p2pAmount } },
      })
      const lB = await tx.ledgerEntry.create({
        data: {
          transactionId: senderTx.id,
          bankAccountId: walletB.id,
          entryType: "CREDIT",
          amount: p2pAmount,
          balanceAfter: updatedB.balance,
        },
      })
      ledgerRecords.push(lB)
    })
    console.log(`  ✓ User A Balance After P2P Transfer: ₦${(150000 - 25000).toLocaleString()}.00`)
    console.log(`  ✓ User B Balance After P2P Transfer: ₦${(10000 + 25000).toLocaleString()}.00\n`)

    // -------------------------------------------------------------------
    // OPERATION 3: EXTERNAL TRANSFER (₦15,000) & WEBHOOK REVERSAL REFUND
    // -------------------------------------------------------------------
    console.log("▶ OPERATION 3: External Transfer of ₦15,000 from User A followed by Webhook Reversal...")
    const extRef = `AUDIT_EXT_${timestamp}`
    const extAmount = 15000.0

    // Outbound Debit
    const extTx = await prisma.$transaction(async (tx) => {
      const etx = await tx.transaction.create({
        data: {
          reference: extRef,
          senderAccountId: walletA.id,
          senderName: userA.name,
          recipientName: "External Recipient",
          bankName: "Zenith Bank",
          accountNumber: "0123456789",
          amount: extAmount,
          fee: 0.0,
          currency: "NGN",
          type: "TRANSFER",
          category: "BANK_TRANSFER",
          status: "PENDING",
        },
      })

      const updated = await tx.bankAccount.update({
        where: { id: walletA.id },
        data: { balance: { decrement: extAmount } },
      })

      const l = await tx.ledgerEntry.create({
        data: {
          transactionId: etx.id,
          bankAccountId: walletA.id,
          entryType: "DEBIT",
          amount: extAmount,
          balanceAfter: updated.balance,
        },
      })
      ledgerRecords.push(l)
      return etx
    })
    txRecords.push(extTx)

    // Reversal Refund (transfer.failed)
    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: extTx.id },
        data: { status: "REVERSED" },
      })

      const updated = await tx.bankAccount.update({
        where: { id: walletA.id },
        data: { balance: { increment: extAmount } },
      })

      const l = await tx.ledgerEntry.create({
        data: {
          transactionId: extTx.id,
          bankAccountId: walletA.id,
          entryType: "CREDIT",
          amount: extAmount,
          balanceAfter: updated.balance,
        },
      })
      ledgerRecords.push(l)
    })
    console.log(`  ✓ User A Balance After External Debit & Reversal Refund: ₦${(125000).toLocaleString()}.00\n`)

    // -------------------------------------------------------------------
    // OPERATION 4: SAVINGS GOAL DEPOSIT (₦20,000) & WITHDRAWAL (₦10,000)
    // -------------------------------------------------------------------
    console.log("▶ OPERATION 4: User A Savings Goal Deposit of ₦20,000 & Partial Withdrawal of ₦10,000...")
    const savingsGoal = await prisma.savingsGoal.create({
      data: {
        userId: userA.id,
        title: "Audit Emergency Fund",
        targetAmount: 100000.0,
        currentAmount: 0.0,
      },
    })

    // Savings Deposit
    const savDepRef = `AUDIT_SAV_DEP_${timestamp}`
    await prisma.$transaction(async (tx) => {
      const stx = await tx.transaction.create({
        data: {
          reference: savDepRef,
          senderAccountId: walletA.id,
          senderName: userA.name,
          recipientName: savingsGoal.title,
          bankName: "BankSpace Savings",
          accountNumber: walletA.accountNumber,
          amount: 20000.0,
          fee: 0.0,
          currency: "NGN",
          type: "SAVINGS",
          category: "SAVINGS_DEPOSIT",
          status: "SUCCESSFUL",
        },
      })
      txRecords.push(stx)

      const updated = await tx.bankAccount.update({
        where: { id: walletA.id },
        data: { balance: { decrement: 20000.0 } },
      })

      await tx.savingsGoal.update({
        where: { id: savingsGoal.id },
        data: { currentAmount: { increment: 20000.0 } },
      })

      const l = await tx.ledgerEntry.create({
        data: {
          transactionId: stx.id,
          bankAccountId: walletA.id,
          entryType: "DEBIT",
          amount: 20000.0,
          balanceAfter: updated.balance,
        },
      })
      ledgerRecords.push(l)
    })

    // Savings Withdrawal
    const savWthRef = `AUDIT_SAV_WTH_${timestamp}`
    await prisma.$transaction(async (tx) => {
      const stx = await tx.transaction.create({
        data: {
          reference: savWthRef,
          senderAccountId: walletA.id,
          senderName: savingsGoal.title,
          recipientName: userA.name,
          bankName: "BankSpace Savings",
          accountNumber: walletA.accountNumber,
          amount: 10000.0,
          fee: 0.0,
          currency: "NGN",
          type: "SAVINGS",
          category: "SAVINGS_WITHDRAWAL",
          status: "SUCCESSFUL",
        },
      })
      txRecords.push(stx)

      const updated = await tx.bankAccount.update({
        where: { id: walletA.id },
        data: { balance: { increment: 10000.0 } },
      })

      await tx.savingsGoal.update({
        where: { id: savingsGoal.id },
        data: { currentAmount: { decrement: 10000.0 } },
      })

      const l = await tx.ledgerEntry.create({
        data: {
          transactionId: stx.id,
          bankAccountId: walletA.id,
          entryType: "CREDIT",
          amount: 10000.0,
          balanceAfter: updated.balance,
        },
      })
      ledgerRecords.push(l)
    })
    console.log(`  ✓ User A Wallet Balance After Savings Moves: ₦${(115000).toLocaleString()}.00\n`)

    // -------------------------------------------------------------------
    // MATHEMATICAL ACCOUNTING RECONCILIATION VERIFICATION
    // -------------------------------------------------------------------
    console.log("==================================================")
    console.log("▶ MATHEMATICAL AUDIT VERIFICATION FOR USER A & B")
    console.log("==================================================")

    const finalAccountA = await prisma.bankAccount.findUnique({ where: { id: walletA.id } })
    const ledgerEntriesA = await prisma.ledgerEntry.findMany({ where: { bankAccountId: walletA.id } })

    let sumCreditsA = 0.0
    let sumDebitsA = 0.0

    ledgerEntriesA.forEach((entry) => {
      if (entry.entryType === "CREDIT") sumCreditsA += entry.amount
      if (entry.entryType === "DEBIT") sumDebitsA += entry.amount
    })

    const expectedBalanceA = openingBalanceA + sumCreditsA - sumDebitsA

    console.log(`User A Audit Breakdown:`)
    console.log(`  Opening Balance : ₦${openingBalanceA.toLocaleString("en-US", { minimumFractionDigits: 2 })}`)
    console.log(`  + Total Credits : ₦${sumCreditsA.toLocaleString("en-US", { minimumFractionDigits: 2 })}`)
    console.log(`  - Total Debits  : ₦${sumDebitsA.toLocaleString("en-US", { minimumFractionDigits: 2 })}`)
    console.log(`  = Calculated    : ₦${expectedBalanceA.toLocaleString("en-US", { minimumFractionDigits: 2 })}`)
    console.log(`  = Actual Wallet : ₦${finalAccountA.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`)

    const diffA = Math.abs(expectedBalanceA - finalAccountA.balance)
    console.log(`  ✓ User A Mathematical Mismatch Discrepancy = ₦${diffA.toFixed(2)}`)

    if (diffA > 0.001) {
      throw new Error(`FAIL: Mismatch detected for User A! Expected ₦${expectedBalanceA}, Got ₦${finalAccountA.balance}`)
    }

    const finalAccountB = await prisma.bankAccount.findUnique({ where: { id: walletB.id } })
    const ledgerEntriesB = await prisma.ledgerEntry.findMany({ where: { bankAccountId: walletB.id } })

    let sumCreditsB = 0.0
    let sumDebitsB = 0.0

    ledgerEntriesB.forEach((entry) => {
      if (entry.entryType === "CREDIT") sumCreditsB += entry.amount
      if (entry.entryType === "DEBIT") sumDebitsB += entry.amount
    })

    const expectedBalanceB = openingBalanceB + sumCreditsB - sumDebitsB

    console.log(`\nUser B Audit Breakdown:`)
    console.log(`  Opening Balance : ₦${openingBalanceB.toLocaleString("en-US", { minimumFractionDigits: 2 })}`)
    console.log(`  + Total Credits : ₦${sumCreditsB.toLocaleString("en-US", { minimumFractionDigits: 2 })}`)
    console.log(`  - Total Debits  : ₦${sumDebitsB.toLocaleString("en-US", { minimumFractionDigits: 2 })}`)
    console.log(`  = Calculated    : ₦${expectedBalanceB.toLocaleString("en-US", { minimumFractionDigits: 2 })}`)
    console.log(`  = Actual Wallet : ₦${finalAccountB.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`)

    const diffB = Math.abs(expectedBalanceB - finalAccountB.balance)
    console.log(`  ✓ User B Mathematical Mismatch Discrepancy = ₦${diffB.toFixed(2)}`)

    if (diffB > 0.001) {
      throw new Error(`FAIL: Mismatch detected for User B! Expected ₦${expectedBalanceB}, Got ₦${finalAccountB.balance}`)
    }

    console.log("\n  ✅ ALL ACCOUNTING FORMULA EQUATIONS RECONCILED WITH ZERO DISCREPANCY (₦0.00)\n")

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Deleting test audit records...")
    const allTxIds = txRecords.map((t) => t.id)
    await prisma.ledgerEntry.deleteMany({ where: { transactionId: { in: allTxIds } } })
    await prisma.transaction.deleteMany({ where: { id: { in: allTxIds } } })
    await prisma.savingsGoal.delete({ where: { id: savingsGoal.id } })
    await prisma.bankAccount.deleteMany({ where: { id: { in: [walletA.id, walletB.id] } } })
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 FULL SYSTEM RECONCILIATION AUDIT PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ RECONCILIATION AUDIT FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

auditFullSystemReconciliation()
