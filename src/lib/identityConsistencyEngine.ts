export type IdentityConsistencyClassification = "MATCH" | "PARTIAL_MATCH" | "MISMATCH" | "REQUIRES_REVIEW" | "UNVERIFIED"

export interface IdentityConsistencyInput {
  googleName?: string | null
  profileFirstName: string
  profileLastName: string
  profileDob: string
  bvnFirstName?: string | null
  bvnLastName?: string | null
  bvnDob?: string | null
  ninFirstName?: string | null
  ninLastName?: string | null
  ninDob?: string | null
  phoneVerified: boolean
}

export interface IdentityConsistencyResult {
  status: IdentityConsistencyClassification
  score: number // 0 to 100
  flags: string[]
  summary: string
  details: {
    profileVsBvnNameScore: number
    profileVsNinNameScore: number
    bvnVsNinNameScore: number
    dobMatch: boolean
    phoneVerified: boolean
  }
}

/**
 * Tokenize string into normalized lowercase word set
 */
function tokenizeName(name: string): string[] {
  if (!name || !name.trim()) return []
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Compute Jaccard Token Overlap & Transposition Similarity Score (0 to 100)
 */
function computeNameSimilarity(nameA: string, nameB: string): number {
  const tokensA = tokenizeName(nameA)
  const tokensB = tokenizeName(nameB)

  if (tokensA.length === 0 || tokensB.length === 0) return 0

  const setA = new Set(tokensA)
  const setB = new Set(tokensB)

  let intersection = 0
  for (const token of setA) {
    if (setB.has(token)) {
      intersection++
    }
  }

  const union = new Set([...tokensA, ...tokensB]).size
  const jaccardScore = union > 0 ? (intersection / union) * 100 : 0

  // Order-independent token match (handles "Olanrewaju Illias" vs "Illias Olanrewaju")
  const isExactTokenSetMatch = tokensA.length === tokensB.length && tokensA.every((t) => setB.has(t))
  if (isExactTokenSetMatch) {
    return 100
  }

  // Subset match (handles middle name omission e.g. "Illias User" vs "Illias Olanrewaju User")
  const isSubset = tokensA.every((t) => setB.has(t)) || tokensB.every((t) => setA.has(t))
  if (isSubset) {
    return 85
  }

  return Math.round(jaccardScore)
}

/**
 * Evaluate Cross-Source Identity Consistency
 */
export function evaluateIdentityConsistency(input: IdentityConsistencyInput): IdentityConsistencyResult {
  const {
    googleName,
    profileFirstName,
    profileLastName,
    profileDob,
    bvnFirstName,
    bvnLastName,
    bvnDob,
    ninFirstName,
    ninLastName,
    ninDob,
    phoneVerified,
  } = input

  const profileFullName = `${profileFirstName} ${profileLastName}`
  const bvnFullName = bvnFirstName && bvnLastName ? `${bvnFirstName} ${bvnLastName}` : profileFullName
  const ninFullName = ninFirstName && ninLastName ? `${ninFirstName} ${ninLastName}` : profileFullName

  const flags: string[] = []

  // 1. Phone Verification Check
  if (!phoneVerified) {
    flags.push("PHONE_NOT_VERIFIED")
  }

  // 2. Date of Birth Consistency Check
  let dobMatch = true
  if (profileDob) {
    if (bvnDob && bvnDob.trim() !== profileDob.trim()) {
      dobMatch = false
      flags.push("BVN_DOB_MISMATCH")
    }
    if (ninDob && ninDob.trim() !== profileDob.trim()) {
      dobMatch = false
      flags.push("NIN_DOB_MISMATCH")
    }
  }

  // 3. Name Similarity Scores across pairs
  const profileVsBvnScore = computeNameSimilarity(profileFullName, bvnFullName)
  const profileVsNinScore = computeNameSimilarity(profileFullName, ninFullName)
  const bvnVsNinScore = computeNameSimilarity(bvnFullName, ninFullName)

  let googleScore = 100
  if (googleName && googleName.trim()) {
    googleScore = computeNameSimilarity(profileFullName, googleName)
    if (googleScore < 60) {
      flags.push("OAUTH_NAME_VARIANCE")
    }
  }

  // Detect specific name transposition / middle name flags
  if (profileVsBvnScore >= 85 && profileVsBvnScore < 100) {
    flags.push("BVN_NAME_TRANSPOSITION_OR_MIDDLE_NAME_OMISSION")
  }
  if (profileVsNinScore >= 85 && profileVsNinScore < 100) {
    flags.push("NIN_NAME_TRANSPOSITION_OR_MIDDLE_NAME_OMISSION")
  }

  if (profileVsBvnScore < 60) {
    flags.push("BVN_NAME_MISMATCH")
  }
  if (profileVsNinScore < 60) {
    flags.push("NIN_NAME_MISMATCH")
  }

  // 4. Calculate Aggregate Consistency Score (0-100)
  let aggregateScore = Math.round(
    profileVsBvnScore * 0.4 +
    profileVsNinScore * 0.4 +
    bvnVsNinScore * 0.1 +
    googleScore * 0.1
  )

  // Hard penalty for DOB mismatch
  if (!dobMatch) {
    aggregateScore = Math.min(35, aggregateScore)
  }

  // Hard penalty if phone not verified
  if (!phoneVerified) {
    aggregateScore = Math.min(50, aggregateScore)
  }

  // 5. Classify Outcome into MATCH, PARTIAL_MATCH, REQUIRES_REVIEW, or MISMATCH
  let status: IdentityConsistencyClassification = "MISMATCH"
  let summary = ""

  if (!dobMatch || profileVsBvnScore < 60 || profileVsNinScore < 60) {
    status = "MISMATCH"
    summary = "Critical Identity Mismatch: Name or Date of Birth differs significantly between profile, BVN, or NIN records."
  } else if (!phoneVerified) {
    status = "REQUIRES_REVIEW"
    summary = "Unverified Phone Number: Requires SMS OTP verification before identity completion."
  } else if (aggregateScore === 100) {
    status = "MATCH"
    summary = "100% Identity Match: Profile, BVN, NIN, and OAuth identity records are completely consistent."
  } else if (aggregateScore >= 80) {
    status = "PARTIAL_MATCH"
    summary = "Partial Identity Match: Identity records match (name order variations or middle name omissions accounted for)."
  } else if (aggregateScore >= 60) {
    status = "REQUIRES_REVIEW"
    summary = "Requires Compliance Review: Minor name formatting variance flagged for manual admin audit."
  } else {
    status = "MISMATCH"
    summary = "Identity Mismatch: Inconsistent cross-source identity records detected."
  }

  return {
    status,
    score: aggregateScore,
    flags,
    summary,
    details: {
      profileVsBvnNameScore: profileVsBvnScore,
      profileVsNinNameScore: profileVsNinScore,
      bvnVsNinNameScore: bvnVsNinScore,
      dobMatch,
      phoneVerified,
    },
  }
}
