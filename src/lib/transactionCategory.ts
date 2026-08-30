export const TransactionCategories = {
  DEPOSIT: "DEPOSIT",
  INCOMING_TRANSFER: "INCOMING_TRANSFER",
  INTERNAL_TRANSFER: "INTERNAL_TRANSFER",
  BANK_TRANSFER: "BANK_TRANSFER",
  WITHDRAWAL: "WITHDRAWAL",
  SAVINGS_DEPOSIT: "SAVINGS_DEPOSIT",
  SAVINGS_WITHDRAWAL: "SAVINGS_WITHDRAWAL",
  INVESTMENT_PURCHASE: "INVESTMENT_PURCHASE",
  INVESTMENT_REDEMPTION: "INVESTMENT_REDEMPTION",
  REFUND: "REFUND",
  REVERSAL: "REVERSAL",
  FEE: "FEE",
} as const

export type TransactionCategoryType = typeof TransactionCategories[keyof typeof TransactionCategories]

export function getTransactionBadgeInfo(category: string, type: string) {
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
