const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

function getTransactionBadgeInfo(category, type) {
  const catUpper = String(category || "").toUpperCase()
  const typeUpper = String(type || "").toUpperCase()

  if (catUpper === "DEPOSIT" || typeUpper === "DEPOSIT") {
    return { label: "Deposit", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" }
  }
  if (catUpper === "INCOMING_TRANSFER" || catUpper === "TRANSFER_RECEIVED") {
    return { label: "Incoming Transfer", badgeClass: "bg-teal-50 text-teal-700 border-teal-200" }
  }
  if (catUpper === "INTERNAL_TRANSFER") {
    return { label: "Internal Transfer", badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200" }
  }
  if (catUpper === "BANK_TRANSFER") {
    return { label: "Bank Transfer", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" }
  }
  if (catUpper === "WITHDRAWAL" || typeUpper === "WITHDRAWAL") {
    return { label: "Withdrawal", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" }
  }
  if (catUpper === "SAVINGS_DEPOSIT") {
    return { label: "Savings Deposit", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" }
  }
  if (catUpper === "SAVINGS_WITHDRAWAL") {
    return { label: "Savings Withdrawal", badgeClass: "bg-orange-50 text-orange-700 border-orange-200" }
  }
  if (catUpper === "INVESTMENT_PURCHASE") {
    return { label: "Investment Purchase", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" }
  }
  if (catUpper === "INVESTMENT_REDEMPTION") {
    return { label: "Investment Redemption", badgeClass: "bg-violet-50 text-violet-700 border-violet-200" }
  }
  if (catUpper === "REFUND") {
    return { label: "Refund", badgeClass: "bg-sky-50 text-sky-700 border-sky-200" }
  }
  if (catUpper === "REVERSAL") {
    return { label: "Reversal", badgeClass: "bg-[#eeeeff] text-[#3f3cff] border-[#3f3cff]/20" }
  }
  if (catUpper === "FEE") {
    return { label: "Fee", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" }
  }

  return { label: category || type || "Transaction", badgeClass: "bg-slate-50 text-slate-700 border-slate-200" }
}

async function testTransaction12Categories() {
  console.log("==================================================")
  console.log("  UNIFIED 12-CATEGORY TRANSACTION ENGINE AUDIT    ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const emailA = `catA_${timestamp}@bankspace.com`

  try {
    const passwordHash = await bcrypt.hash("Password123!", 10)

    console.log("▶ SETUP: Creating User A for 12-Category Financial Audit...")
    const userA = await prisma.user.create({
      data: { name: "12-Category User A", email: emailA, passwordHash, role: "USER", isVerified: true },
    })

    const walletA = await prisma.bankAccount.create({
      data: {
        userId: userA.id,
        accountNumber: "20" + Math.floor(10000000 + Math.random() * 90000000),
        accountName: userA.name,
        bankName: "BankSpace MFB",
        balance: 250000.0,
        currency: "NGN",
        isPrimary: true,
        status: "ACTIVE",
      },
    })

    const categoriesToTest = [
      { type: "DEPOSIT", category: "DEPOSIT", label: "Deposit", amount: 50000.0 },
      { type: "TRANSFER", category: "INCOMING_TRANSFER", label: "Incoming Transfer", amount: 20000.0 },
      { type: "TRANSFER", category: "INTERNAL_TRANSFER", label: "Internal Transfer", amount: 15000.0 },
      { type: "TRANSFER", category: "BANK_TRANSFER", label: "Bank Transfer", amount: 30000.0 },
      { type: "WITHDRAWAL", category: "WITHDRAWAL", label: "Withdrawal", amount: 10000.0 },
      { type: "SAVINGS", category: "SAVINGS_DEPOSIT", label: "Savings Deposit", amount: 25000.0 },
      { type: "SAVINGS", category: "SAVINGS_WITHDRAWAL", label: "Savings Withdrawal", amount: 5000.0 },
      { type: "INVESTMENT", category: "INVESTMENT_PURCHASE", label: "Investment Purchase", amount: 40000.0 },
      { type: "INVESTMENT", category: "INVESTMENT_REDEMPTION", label: "Investment Redemption", amount: 45000.0 },
      { type: "REFUND", category: "REFUND", label: "Refund", amount: 2000.0 },
      { type: "REVERSAL", category: "REVERSAL", label: "Reversal", amount: 30000.0 },
      { type: "FEE", category: "FEE", label: "Fee", amount: 50.0 },
    ]

    console.log("▶ TEST 1: Verifying Category Badge Helper for All 12 Categories...")
    categoriesToTest.forEach((c) => {
      const badgeInfo = getTransactionBadgeInfo(c.category, c.type)
      console.log(`  ✓ Category '${c.category}': Label="${badgeInfo.label}", Badge="${badgeInfo.badgeClass}"`)
      if (badgeInfo.label !== c.label) {
        throw new Error(`FAIL: Badge label mismatch for category ${c.category}`)
      }
    })
    console.log("  ✅ TEST 1 PASSED: Badge UI Helper Reconciled\n")

    console.log("▶ TEST 2: Creating Database Transactions for All 12 Categories...")
    const createdTxIds = []

    for (const c of categoriesToTest) {
      const refKey = `CAT_${c.category}_${timestamp}`
      const tx = await prisma.transaction.create({
        data: {
          reference: refKey,
          senderAccountId: walletA.id,
          senderName: userA.name,
          recipientName: "Audit Target",
          bankName: "BankSpace MFB",
          accountNumber: walletA.accountNumber,
          amount: c.amount,
          fee: 0.0,
          currency: "NGN",
          type: c.type,
          category: c.category,
          status: "SUCCESSFUL",
          description: `Test for category ${c.category}`,
        },
      })
      createdTxIds.push(tx.id)
    }

    console.log(`  ✓ Successfully Created ${createdTxIds.length} Transactions Across 12 Categories`)

    const fetchedTxs = await prisma.transaction.findMany({
      where: { id: { in: createdTxIds } },
    })

    const foundCategories = new Set(fetchedTxs.map((t) => t.category))
    console.log(`  ✓ Distinct Financial Categories in DB: ${foundCategories.size} of 12`)
    if (foundCategories.size !== 12) {
      throw new Error("FAIL: Database category count mismatch!")
    }

    console.log("  ✅ TEST 2 PASSED: All 12 Categories Stored & Reconciled in PostgreSQL\n")

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Deleting test audit records...")
    await prisma.transaction.deleteMany({ where: { id: { in: createdTxIds } } })
    await prisma.bankAccount.delete({ where: { id: walletA.id } })
    await prisma.user.delete({ where: { id: userA.id } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 12-CATEGORY TRANSACTION ENGINE TEST PASSED 100%")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ 12-CATEGORY TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testTransaction12Categories()
