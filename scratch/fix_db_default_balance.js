const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function fixDbDefaultBalance() {
  try {
    console.log("Setting PostgreSQL column default for balance to 0.0...")
    await prisma.$executeRawUnsafe(`ALTER TABLE "bank_accounts" ALTER COLUMN "balance" SET DEFAULT 0.0;`)
    console.log("✓ Column default successfully altered to 0.0 in NeonDB!")
  } catch (err) {
    console.error("Error altering default:", err)
  } finally {
    await prisma.$disconnect()
  }
}

fixDbDefaultBalance()
