import { getPrismaClient } from "./prisma"
import { normalizePhoneNumberToAccountNumber } from "./phoneNormalization"

/**
 * Migration & Backfill Engine for BankSpace 10-Digit Phone-Based Account Numbers
 * 
 * Ensures all registered users have a primary BankAccount with a normalized 10-digit
 * phone-based account identifier.
 */
export async function backfillUserAccountNumbers(): Promise<{ processed: number; updated: number }> {
  const { client, isFallback } = getPrismaClient()
  if (isFallback || !client?.user) {
    return { processed: 0, updated: 0 }
  }

  let processed = 0
  let updated = 0

  try {
    const users = await client.user.findMany({
      include: {
        bankAccounts: {
          orderBy: { isPrimary: "desc" },
        },
      },
    })

    for (const user of users) {
      processed++
      const targetAccountNumber = normalizePhoneNumberToAccountNumber(user.phone, user.id)
      const primaryAccount = user.bankAccounts?.[0]

      if (!primaryAccount) {
        // Create new primary bank account with normalized 10-digit number
        try {
          await client.bankAccount.create({
            data: {
              userId: user.id,
              accountNumber: targetAccountNumber,
              accountName: user.name,
              bankName: "BankSpace Microfinance Bank",
              accountType: "CHECKING",
              balance: 0.0,
              isPrimary: true,
              status: "ACTIVE",
            },
          })
          updated++
        } catch (err) {
          console.warn(`[Backfill Notice] Failed to create primary account for user ${user.id}:`, err)
        }
      } else if (
        primaryAccount.accountNumber !== targetAccountNumber &&
        (primaryAccount.accountNumber.startsWith("20") || primaryAccount.accountNumber.length !== 10)
      ) {
        // Update existing primary account to 10-digit normalized phone number
        try {
          await client.bankAccount.update({
            where: { id: primaryAccount.id },
            data: {
              accountNumber: targetAccountNumber,
            },
          })
          updated++
        } catch (err) {
          console.warn(`[Backfill Notice] Unique conflict on updating account ${primaryAccount.id} to ${targetAccountNumber}:`, err)
        }
      }
    }
  } catch (err) {
    console.warn("[Backfill Engine Exception]:", err)
  }

  return { processed, updated }
}
