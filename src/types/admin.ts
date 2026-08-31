/* eslint-disable @typescript-eslint/no-explicit-any */

export interface AdminUserSummary {
  id: string
  name: string
  email: string
  role: string
  isVerified: boolean
  isSuspended: boolean
  kycStatus: string
  createdAt: string
  updatedAt: string
  primaryAccount?: {
    accountNumber: string
    balance: number
    status: string
  }
}

export interface AdminUserDetail extends AdminUserSummary {
  phone?: string | null
  kycRejectionReason?: string | null
  kycSubmittedAt?: string | null
  bankAccounts: Array<{
    id: string
    accountNumber: string
    accountName: string
    bankName: string
    balance: number
    currency: string
    status: string
    isPrimary: boolean
    createdAt: string
  }>
}

export interface AdminTransactionRecord {
  id: string
  reference: string
  providerRef?: string | null
  type: string
  amount: number
  fee: number
  status: string
  senderName: string
  recipientName?: string | null
  accountNumber?: string | null
  createdAt: string
}

export interface AdminTransferRecord {
  id: string
  reference: string
  providerRef?: string | null
  senderName: string
  recipientName: string
  accountNumber: string
  bankName: string
  amount: number
  fee: number
  status: string
  failureReason?: string | null
  createdAt: string
}

export interface AdminKycSubmission {
  id: string
  name: string
  email: string
  isVerified: boolean
  kycStatus: string
  kycRejectionReason?: string | null
  kycSubmittedAt?: string | null
  createdAt: string
  primaryAccount?: {
    accountNumber: string
    status: string
  }
}

export interface AdminAuditLogEntry {
  id: string
  adminId?: string | null
  adminEmail?: string | null
  adminName?: string | null
  action: string
  targetEntity?: string | null
  targetId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: string | null
  createdAt: string
}

export interface AdminOperationalAlert {
  id: string
  title: string
  message: string
  type: "INFO" | "SUCCESS" | "WARNING" | "SECURITY"
  link?: string
  createdAt: string
}

export interface AdminSearchResultItem {
  id: string
  title: string
  subtitle: string
  badge: string
  badgeColor: string
  entity: string
  link: string
}

export interface AdminSearchResultsGroup {
  users: AdminSearchResultItem[]
  accounts: AdminSearchResultItem[]
  transactions: AdminSearchResultItem[]
  transfers: AdminSearchResultItem[]
  auditLogs: AdminSearchResultItem[]
}

export interface AdminSystemStatus {
  dbStatus: string
  paystackStatus: string
  environment: string
  rateLimiting: string
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}
