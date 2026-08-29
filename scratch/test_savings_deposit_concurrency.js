const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function runConcurrencyTests() {
  console.log("==================================================")
  console.log("  SAVINGS DEPOSIT CONCURRENCY & RACE CONDITION TEST ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const testEmail = `conc_user_${timestamp}@bankspace.com`
  const password = "Password123!"

  try {
    // 1. Setup User & Primary Bank Account with ₦50,000 balance
    console.log("▶ SETUP: Creating Test User & Primary Wallet (₦50,000)")
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        name: "Concurrency Test User",
        email: testEmail,
        passwordHash,
        role: "USER",
        isVerified: true,
      },
    })

    const accNum = "20" + Math.floor(10000000 + Math.random() * 90000000)
    const primaryAccount = await prisma.bankAccount.create({
      data: {
        userId: user.id,
        accountNumber: accNum,
        accountName: user.name,
        bankName: "BankSpace MFB",
        balance: 50000.0, // Balance = ₦50,000
        currency: "NGN",
        isPrimary: true,
        status: "ACTIVE",
      },
    })

    const savingsAccount = await prisma.savingsGoal.create({
      data: {
        userId: user.id,
        title: "Concurrency Goal Vault",
        targetAmount: 200000.0,
        currentAmount: 0.0,
        category: "GENERAL",
      },
    })

    console.log(`  ✓ Primary Wallet Balance: ₦${primaryAccount.balance.toLocaleString()}`)
    console.log(`  ✓ Savings Vault Balance: ₦${savingsAccount.currentAmount.toLocaleString()}\n`)

    // -------------------------------------------------------------------
    // CONCURRENCY TEST: 2 Parallel Deposit Requests of ₦40,000 Simultaneously
    // -------------------------------------------------------------------
    console.log("▶ CONCURRENCY TEST: Triggering 2 Parallel ₦40,000 Deposit Requests Simultaneously...")

    const executeDeposit = async (reqId) => {
      const depositAmount = 40000.0
      const ref = `SAV_CONC_${timestamp}_${reqId}`

      try {
        return await prisma.$transaction(async (tx) => {
          // Atomic Balance Decrement Guard: balance >= 40,000 check!
          const decResult = await tx.bankAccount.updateMany({
            where: { id: primaryAccount.id, balance: { gte: depositAmount }, status: "ACTIVE" },
            data: { balance: { decrement: depositAmount } },
          })

          if (decResult.count === 0) {
            throw new Error(`INSUFFICIENT_FUNDS: Request ${reqId} failed due to concurrent balance conflict`)
          }

          const updatedPrimary = await tx.bankAccount.findUnique({ where: { id: primaryAccount.id } })

          const updatedSavings = await tx.savingsGoal.update({
            where: { id: savingsAccount.id },
            data: { currentAmount: { increment: depositAmount } },
          })

          const txRecord = await tx.transaction.create({
            data: {
              reference: ref,
              senderAccountId: primaryAccount.id,
              senderName: user.name,
              recipientName: savingsAccount.title,
              bankName: "BankSpace Savings Vault",
              accountNumber: primaryAccount.accountNumber,
              amount: depositAmount,
              fee: 0.0,
              currency: "NGN",
              type: "SAVINGS_DEPOSIT",
              category: "Savings",
              status: "SUCCESSFUL",
              description: `Deposit to savings vault (${savingsAccount.title})`,
            },
          })

          await tx.ledgerEntry.create({
            data: {
              transactionId: txRecord.id,
              bankAccountId: primaryAccount.id,
              entryType: "DEBIT",
              amount: depositAmount,
              balanceAfter: updatedPrimary.balance,
            },
          })

          return { success: true, reqId, ref, primaryBalance: updatedPrimary.balance, savingsBalance: updatedSavings.currentAmount }
        })
      } catch (err) {
        return { success: false, reqId, ref, error: err.message }
      }
    }

    // Fire both requests in parallel at the exact same millisecond!
    const results = await Promise.all([executeDeposit(1), executeDeposit(2)])

    const succeeded = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    console.log(`\n  ✓ Parallel Execution Results:`)
    console.log(`    • Successful Requests: ${succeeded.length}`)
    console.log(`    • Rejected Requests: ${failed.length}`)

    succeeded.forEach((r) => console.log(`    [SUCCESS] Req #${r.reqId} completed (Ref: ${r.ref})`))
    failed.forEach((r) => console.log(`    [REJECTED] Req #${r.reqId} safely blocked ("${r.error}")`))

    // -------------------------------------------------------------------
    // VERIFY DATABASE BALANCE INTEGRITY
    // -------------------------------------------------------------------
    console.log("\n▶ VERIFYING DATABASE BALANCE & LEDGER INTEGRITY...")
    const finalPrimary = await prisma.bankAccount.findUnique({ where: { id: primaryAccount.id } })
    const finalSavings = await prisma.savingsGoal.findUnique({ where: { id: savingsAccount.id } })

    console.log(`  ✓ Final Primary Wallet Balance: ₦${finalPrimary.balance.toLocaleString()} (Expected ₦10,000)`)
    console.log(`  ✓ Final Savings Vault Balance: ₦${finalSavings.currentAmount.toLocaleString()} (Expected ₦40,000)`)

    if (finalPrimary.balance === 10000.0 && finalSavings.currentAmount === 40000.0 && succeeded.length === 1 && failed.length === 1) {
      console.log("  ✅ CONCURRENCY & OVERDRAFT PROTECTION VERIFIED PERFECTLY! ZERO OVERDRAFT DETECTED.")
    } else {
      throw new Error("Concurrency failure: Double-debit or balance mismatch detected!")
    }

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("\n▶ CLEANUP: Deleting test records...")
    await prisma.ledgerEntry.deleteMany({ where: { bankAccountId: primaryAccount.id } })
    await prisma.transaction.deleteMany({ where: { senderAccountId: primaryAccount.id } })
    await prisma.savingsGoal.delete({ where: { id: savingsAccount.id } })
    await prisma.bankAccount.delete({ where: { id: primaryAccount.id } })
    await prisma.user.delete({ where: { id: user.id } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 CONCURRENCY TEST SUITE PASSED WITH 100% SUCCESS ")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ CONCURRENCY TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runConcurrencyTests()
