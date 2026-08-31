/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AdminSearchResultsGroup,
  AdminOperationalAlert,
  AdminSystemStatus,
} from "@/types/admin"

export async function fetchAdminStatsApi() {
  const res = await fetch("/api/admin/stats")
  if (!res.ok) throw new Error("Failed to fetch admin stats")
  return await res.json()
}

export async function fetchAdminUsersApi(page = 1, limit = 10, status = "ALL", search = "", sortBy = "createdAt", sortOrder = "desc") {
  const url = `/api/admin/users?page=${page}&limit=${limit}&status=${status}&search=${encodeURIComponent(search)}&sortBy=${sortBy}&sortOrder=${sortOrder}`
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch admin users")
  return await res.json()
}

export async function fetchAdminTransactionsApi(page = 1, limit = 10, status = "ALL", type = "ALL", search = "", startDate = "", endDate = "", sortBy = "createdAt", sortOrder = "desc") {
  const url = `/api/admin/transactions?page=${page}&limit=${limit}&status=${status}&type=${type}&search=${encodeURIComponent(search)}&startDate=${startDate}&endDate=${endDate}&sortBy=${sortBy}&sortOrder=${sortOrder}`
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch admin transactions")
  return await res.json()
}

export async function fetchAdminTransfersApi(page = 1, limit = 10, status = "ALL", search = "", startDate = "", endDate = "", sortBy = "createdAt", sortOrder = "desc") {
  const url = `/api/admin/transfers?page=${page}&limit=${limit}&status=${status}&search=${encodeURIComponent(search)}&startDate=${startDate}&endDate=${endDate}&sortBy=${sortBy}&sortOrder=${sortOrder}`
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch admin transfers")
  return await res.json()
}

export async function fetchAdminKycApi(page = 1, limit = 10, status = "ALL", search = "") {
  const url = `/api/admin/kyc?page=${page}&limit=${limit}&status=${status}&search=${encodeURIComponent(search)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch KYC queue")
  return await res.json()
}

export async function executeKycDecisionApi(userId: string, action: "APPROVE" | "REJECT", reason?: string) {
  const res = await fetch("/api/admin/kyc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, action, reason }),
  })
  const data = await res.json()
  if (!res.ok || !data.success) throw new Error(data.message || "Failed to execute KYC decision")
  return data
}

export async function fetchAdminLogsApi(page = 1, limit = 10, action = "ALL", search = "", startDate = "", endDate = "") {
  const url = `/api/admin/logs?page=${page}&limit=${limit}&action=${action}&search=${encodeURIComponent(search)}&startDate=${startDate}&endDate=${endDate}`
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch audit logs")
  return await res.json()
}

export async function fetchAdminNotificationsApi(): Promise<{ unreadCount: number; operationalAlerts: AdminOperationalAlert[] }> {
  const res = await fetch("/api/admin/notifications")
  if (!res.ok) throw new Error("Failed to fetch admin notifications")
  return await res.json()
}

export async function executeGlobalAdminSearchApi(query: string): Promise<{ totalCount: number; results: AdminSearchResultsGroup }> {
  const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}`)
  if (!res.ok) throw new Error("Failed to execute global admin search")
  return await res.json()
}

export async function fetchAdminSettingsApi(): Promise<{ profile: any; security: any; system: AdminSystemStatus }> {
  const res = await fetch("/api/admin/settings")
  if (!res.ok) throw new Error("Failed to fetch admin settings")
  return await res.json()
}
