import { NextResponse } from "next/server"

export type KycState =
  | "NOT_STARTED"
  | "PROFILE_INCOMPLETE"
  | "PHONE_PENDING"
  | "PHONE_VERIFIED"
  | "KYC_PENDING"
  | "KYC_VERIFIED"
  | "KYC_FAILED"
  | "MANUAL_REVIEW"
  | "ACTIVE"
  | "SUSPENDED"

export type AccessLevel =
  | "LIMITED"
  | "BASIC_ACCOUNT"
  | "RESTRICTED"
  | "FULL_ACCOUNT"
  | "NO_TRANSACTIONS"

export interface UserKycRecord {
  id?: string
  role?: string
  kycStatus?: string | null
  kycState?: string | null
  phoneVerified?: boolean | null
  firstName?: string | null
  lastName?: string | null
  dob?: string | null
  bvnStatus?: string | null
  ninStatus?: string | null
  identityConsistencyStatus?: string | null
  isSuspended?: boolean | null
}

export interface KycStateEvaluation {
  state: KycState
  accessLevel: AccessLevel
  description: string
  canPerformFinancialMutations: boolean
}

const ACCESS_LEVEL_WEIGHT: Record<AccessLevel, number> = {
  NO_TRANSACTIONS: 0,
  LIMITED: 1,
  RESTRICTED: 2,
  BASIC_ACCOUNT: 3,
  FULL_ACCOUNT: 4,
}

/**
 * Authoritative Backend KYC State & Access Level Derivation
 */
export function deriveUserKycState(user: UserKycRecord | null | undefined): KycStateEvaluation {
  if (!user) {
    return {
      state: "NOT_STARTED",
      accessLevel: "LIMITED",
      description: "Unauthenticated or uninitialized session.",
      canPerformFinancialMutations: false,
    }
  }

  // 1. Role / Admin Bypass
  if (user.role === "ADMIN") {
    return {
      state: "ACTIVE",
      accessLevel: "FULL_ACCOUNT",
      description: "Admin Privilege Access Granted.",
      canPerformFinancialMutations: true,
    }
  }

  // 2. Suspended Enforcement
  if (user.kycStatus === "SUSPENDED" || user.isSuspended === true) {
    return {
      state: "SUSPENDED",
      accessLevel: "NO_TRANSACTIONS",
      description: "Account suspended by compliance officer. No financial transactions allowed.",
      canPerformFinancialMutations: false,
    }
  }

  // 3. Profile Completeness Check
  if (!user.firstName || !user.lastName || !user.dob) {
    return {
      state: "PROFILE_INCOMPLETE",
      accessLevel: "LIMITED",
      description: "Complete your BankSpace profile to activate basic features.",
      canPerformFinancialMutations: false,
    }
  }

  // 4. Phone Verification Check
  if (!user.phoneVerified) {
    return {
      state: "PHONE_PENDING",
      accessLevel: "LIMITED",
      description: "SMS OTP phone verification required before financial account activation.",
      canPerformFinancialMutations: false,
    }
  }

  // 5. Hard Failure Check
  if (
    user.bvnStatus === "FAILED" ||
    user.ninStatus === "FAILED" ||
    user.identityConsistencyStatus === "MISMATCH" ||
    user.kycStatus === "REJECTED"
  ) {
    return {
      state: "KYC_FAILED",
      accessLevel: "RESTRICTED",
      description: "Identity verification failed. First Name, Last Name, or Date of Birth mismatch.",
      canPerformFinancialMutations: false,
    }
  }

  // 6. Manual Compliance Audit Flag Check
  if (
    user.identityConsistencyStatus === "REQUIRES_REVIEW" ||
    user.bvnStatus === "REQUIRES_REVIEW" ||
    user.ninStatus === "REQUIRES_REVIEW" ||
    user.kycStatus === "REQUIRES_REVIEW"
  ) {
    return {
      state: "MANUAL_REVIEW",
      accessLevel: "RESTRICTED",
      description: "Identity flagged for manual compliance review by risk engine.",
      canPerformFinancialMutations: false,
    }
  }

  // 7. Verified / Active Full Access Check
  const isBvnVerified = user.bvnStatus === "VERIFIED"
  const isNinVerified = user.ninStatus === "VERIFIED"
  const isConsistencyMatch =
    user.identityConsistencyStatus === "MATCH" || user.identityConsistencyStatus === "PARTIAL_MATCH"

  if (isBvnVerified && isNinVerified && isConsistencyMatch) {
    return {
      state: "ACTIVE",
      accessLevel: "FULL_ACCOUNT",
      description: "Full account access active. Unrestricted financial operations enabled.",
      canPerformFinancialMutations: true,
    }
  }

  // 8. Basic Account (Phone verified, awaiting BVN/NIN completion)
  if (user.phoneVerified && (!user.bvnStatus || user.bvnStatus === "UNVERIFIED")) {
    return {
      state: "PHONE_VERIFIED",
      accessLevel: "BASIC_ACCOUNT",
      description: "Phone verified. Basic account active. Complete BVN/NIN for full limits.",
      canPerformFinancialMutations: false,
    }
  }

  // Default: KYC Pending
  return {
    state: "KYC_PENDING",
    accessLevel: "RESTRICTED",
    description: "Compliance verification in progress.",
    canPerformFinancialMutations: false,
  }
}

/**
 * Backend API Guard: Enforces required Access Level on financial routes
 */
export function enforceBackendKycAccess(
  user: UserKycRecord | null | undefined,
  requiredLevel: AccessLevel = "FULL_ACCOUNT"
): { allowed: boolean; response?: NextResponse } {
  const evalResult = deriveUserKycState(user)
  const userWeight = ACCESS_LEVEL_WEIGHT[evalResult.accessLevel]
  const requiredWeight = ACCESS_LEVEL_WEIGHT[requiredLevel]

  if (userWeight < requiredWeight) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: "Forbidden",
          message: `Access denied. ${evalResult.description}`,
          kycState: evalResult.state,
          accessLevel: evalResult.accessLevel,
          requiredAccessLevel: requiredLevel,
        },
        { status: 403 }
      ),
    }
  }

  return { allowed: true }
}
