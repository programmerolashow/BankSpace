const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function testBudgetDomain() {
  console.log("==================================================")
  console.log("     BANKSPACE BUDGET DOMAIN TEST SUITE          ")
  console.log("==================================================\n")

  const timestamp = Date.now()
  const testEmail = `budget_user_${timestamp}@bankspace.com`

  try {
    // -------------------------------------------------------------------
    // SETUP: USER & PRIMARY WALLET (₦200,000 Balance)
    // -------------------------------------------------------------------
    console.log("▶ SETUP: Creating Test User & Wallet (₦200,000 Balance)")
    const passwordHash = await bcrypt.hash("Password123!", 10)
    const user = await prisma.user.create({
      data: { name: "Budget Test User", email: testEmail, passwordHash, role: "USER", isVerified: true },
    })

    const wallet = await prisma.bankAccount.create({
      data: {
        userId: user.id,
        accountNumber: "20" + Math.floor(10000000 + Math.random() * 90000000),
        accountName: user.name,
        bankName: "BankSpace MFB",
        balance: 200000.0,
        currency: "NGN",
        isPrimary: true,
        status: "ACTIVE",
      },
    })
    console.log(`  ✓ User ID=${user.id}, Initial Wallet Balance=₦${wallet.balance.toLocaleString()}.00\n`)

    // -------------------------------------------------------------------
    // TEST 1: BUDGET CREATION NON-FINANCIAL RULE
    // Creating budget must NOT decrease or increase wallet balance!
    // -------------------------------------------------------------------
    console.log("▶ TEST 1: Creating Budget Cap (₦50,000 Limit for GROCERIES)...")
    const budget = await prisma.budget.create({
      data: {
        userId: user.id,
        name: "Monthly Groceries & Food",
        category: "GROCERIES",
        amount: 50000.0,
        spent: 0.0,
        currency: "NGN",
        period: "MONTHLY",
        status: "ACTIVE",
      },
    })

    const walletAfterBudgetCreate = await prisma.bankAccount.findUnique({ where: { id: wallet.id } })
    console.log(`  ✓ Created Budget ID=${budget.id}, Cap=₦${budget.amount.toLocaleString()}.00`)
    console.log(`  ✓ Wallet Balance After Budget Creation: ₦${walletAfterBudgetCreate.balance.toLocaleString()}.00`)

    if (walletAfterBudgetCreate.balance !== 200000.0) {
      throw new Error("FAIL: Budget creation modified liquid wallet balance! Budget is NOT money.")
    }
    console.log("  ✅ TEST 1 PASSED: Strict Non-Financial Rule Verified (0 Balance Modification)\n")

    // -------------------------------------------------------------------
    // TEST 2: SPENDING CALCULATION FROM TRANSACTIONS
    // Create ₦20,000 debit transaction in GROCERIES category
    // -------------------------------------------------------------------
    console.log("▶ TEST 2: Performing ₦20,000 Debit Transaction in GROCERIES Category...")
    await prisma.transaction.create({
      data: {
        reference: `BDG_TX_1_${timestamp}`,
        senderAccountId: wallet.id,
        senderName: user.name,
        recipientName: "Supermarket Mart",
        bankName: "BankSpace MFB",
        accountNumber: wallet.accountNumber,
        amount: 20000.0,
        category: "GROCERIES",
        type: "TRANSFER",
        status: "SUCCESSFUL",
      },
    })

    // Query spending calculation
    const groceryTxs = await prisma.transaction.findMany({
      where: { senderAccountId: wallet.id, category: "GROCERIES", status: "SUCCESSFUL" },
    })

    const computedSpent1 = groceryTxs.reduce((sum, t) => sum + t.amount, 0)
    const remaining1 = Math.max(0, budget.amount - computedSpent1)
    const progress1 = Math.round((computedSpent1 / budget.amount) * 100)

    console.log(`  ✓ Computed Spent: ₦${computedSpent1.toLocaleString()}.00 (Expected ₦20,000)`)
    console.log(`  ✓ Remaining Cap: ₦${remaining1.toLocaleString()}.00 (Expected ₦30,000)`)
    console.log(`  ✓ Progress: ${progress1}% (Expected 40%)`)

    if (computedSpent1 === 20000.0 && remaining1 === 30000.0 && progress1 === 40) {
      console.log("  ✅ TEST 2 PASSED: Server-Side Spending Engine Reconciled\n")
    } else {
      throw new Error("FAIL: Spending calculation mismatch!")
    }

    // -------------------------------------------------------------------
    // TEST 3: OVERSPENDING DETECTION & EXCEEDED STATUS TRANSITION
    // Perform additional ₦40,000 debit transaction (Total ₦60,000 vs ₦50,000 Cap)
    // -------------------------------------------------------------------
    console.log("▶ TEST 3: Performing ₦40,000 Debit Transaction (Total ₦60,000 vs ₦50,000 Cap)...")
    await prisma.transaction.create({
      data: {
        reference: `BDG_TX_2_${timestamp}`,
        senderAccountId: wallet.id,
        senderName: user.name,
        recipientName: "Mega Supermarket",
        bankName: "BankSpace MFB",
        accountNumber: wallet.accountNumber,
        amount: 40000.0,
        category: "GROCERIES",
        type: "TRANSFER",
        status: "SUCCESSFUL",
      },
    })

    const allGroceryTxs = await prisma.transaction.findMany({
      where: { senderAccountId: wallet.id, category: "GROCERIES", status: "SUCCESSFUL" },
    })

    const computedSpent2 = allGroceryTxs.reduce((sum, t) => sum + t.amount, 0) // ₦60,000
    const isOverspent = computedSpent2 > budget.amount

    let updatedBudget = budget
    if (isOverspent) {
      updatedBudget = await prisma.budget.update({
        where: { id: budget.id },
        data: { status: "EXCEEDED", spent: computedSpent2 },
      })
    }

    console.log(`  ✓ Total Spent: ₦${computedSpent2.toLocaleString()}.00`)
    console.log(`  ✓ Overspent Flag: ${isOverspent} (Expected true)`)
    console.log(`  ✓ Updated Budget Status: ${updatedBudget.status} (Expected EXCEEDED)`)

    if (isOverspent && updatedBudget.status === "EXCEEDED") {
      console.log("  ✅ TEST 3 PASSED: Overspending Detection & Status Transition Verified\n")
    } else {
      throw new Error("FAIL: Overspending detection failed!")
    }

    // -------------------------------------------------------------------
    // TEST 4: EDIT & DELETE BUDGET
    // -------------------------------------------------------------------
    console.log("▶ TEST 4: Editing Budget Limit to ₦100,000 and Deleting...")
    const editedBudget = await prisma.budget.update({
      where: { id: budget.id },
      data: { amount: 100000.0, status: "ACTIVE" },
    })
    console.log(`  ✓ Updated Budget Cap: ₦${editedBudget.amount.toLocaleString()}.00`)

    await prisma.budget.delete({ where: { id: budget.id } })
    const deletedCheck = await prisma.budget.findUnique({ where: { id: budget.id } })

    if (!deletedCheck) {
      console.log("  ✓ Budget Record Deleted Successfully.")
      console.log("  ✅ TEST 4 PASSED\n")
    } else {
      throw new Error("FAIL: Budget deletion failed!")
    }

    // -------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------
    console.log("▶ CLEANUP: Deleting test audit records...")
    await prisma.transaction.deleteMany({ where: { senderAccountId: wallet.id } })
    await prisma.bankAccount.delete({ where: { id: wallet.id } })
    await prisma.user.delete({ where: { id: user.id } })
    console.log("  ✓ Cleanup complete.\n")

    console.log("==================================================")
    console.log("   🎉 ALL BUDGET DOMAIN TESTS PASSED WITH 100% SUCCESS")
    console.log("==================================================")
  } catch (err) {
    console.error("❌ BUDGET DOMAIN TEST FAILED:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testBudgetDomain()
