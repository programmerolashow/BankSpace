/**
 * BankSpace Phone-Based 10-Digit Account Identifier Engine
 * 
 * Normalizes input Nigerian phone numbers into a 10-digit BankSpace account identifier.
 * 
 * Examples:
 *  - "08012345678"     => "8012345678"
 *  - "+2348012345678"  => "8012345678"
 *  - "2348012345678"   => "8012345678"
 *  - "8012345678"      => "8012345678"
 *  - "+234 801 234 5678" => "8012345678"
 */

export function normalizePhoneNumberToAccountNumber(phoneInput?: string | null, userIdFallback?: string): string {
  if (!phoneInput) {
    return generateFallbackAccountNumber(userIdFallback)
  }

  // 1. Strip all non-digit characters
  const rawDigits = phoneInput.replace(/\D/g, "")

  // 2. Case: International format with country code 234 (e.g. 2348012345678 -> 13 digits)
  if (rawDigits.startsWith("234") && rawDigits.length === 13) {
    return rawDigits.slice(3)
  }

  // 3. Case: Standard domestic format with leading 0 (e.g. 08012345678 -> 11 digits)
  if (rawDigits.startsWith("0") && rawDigits.length === 11) {
    return rawDigits.slice(1)
  }

  // 4. Case: Already normalized 10-digit number (e.g. 8012345678 -> 10 digits)
  if (rawDigits.length === 10 && (rawDigits.startsWith("7") || rawDigits.startsWith("8") || rawDigits.startsWith("9"))) {
    return rawDigits
  }

  // 5. Fallback for non-standard digit sequences
  if (rawDigits.length >= 10) {
    const sliced = rawDigits.slice(-10)
    if (sliced.length === 10) return sliced
  }

  return generateFallbackAccountNumber(userIdFallback)
}

function generateFallbackAccountNumber(userIdFallback?: string): string {
  if (userIdFallback) {
    let hash = 0
    for (let i = 0; i < userIdFallback.length; i++) {
      hash = (hash << 5) - hash + userIdFallback.charCodeAt(i)
      hash |= 0
    }
    const positiveHash = Math.abs(hash).toString().padStart(9, "0").slice(0, 9)
    return "8" + positiveHash
  }

  const randomDigits = Math.floor(100000000 + Math.random() * 900000000).toString()
  return "8" + randomDigits
}
