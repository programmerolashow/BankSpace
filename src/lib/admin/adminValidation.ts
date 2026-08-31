/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ValidatedPagination {
  page: number
  limit: number
  search: string
  status: string
  sortBy: string
  sortOrder: "asc" | "desc"
}

export function validatePaginationParams(searchParams: URLSearchParams): ValidatedPagination {
  const page = Math.max(Number(searchParams.get("page") || 1), 1)
  const limit = Math.max(Math.min(Number(searchParams.get("limit") || 10), 100), 1)
  const search = searchParams.get("search")?.trim() || ""
  const status = searchParams.get("status")?.trim() || "ALL"
  const sortBy = searchParams.get("sortBy")?.trim() || "createdAt"
  const sortOrder = searchParams.get("sortOrder")?.trim().toLowerCase() === "asc" ? "asc" : "desc"

  return {
    page,
    limit,
    search,
    status,
    sortBy,
    sortOrder,
  }
}

export function validateUserActionPayload(body: any): { valid: boolean; error?: string; action?: string; reason?: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request payload body." }
  }

  const { action, reason } = body
  if (!action || typeof action !== "string") {
    return { valid: false, error: "Action parameter is required." }
  }

  const normalizedAction = action.toUpperCase().trim()
  const allowedActions = ["SUSPEND", "ACTIVATE", "VERIFY", "UNVERIFY"]

  if (!allowedActions.includes(normalizedAction)) {
    return { valid: false, error: `Unsupported user action: ${action}. Allowed: ${allowedActions.join(", ")}` }
  }

  return {
    valid: true,
    action: normalizedAction,
    reason: typeof reason === "string" ? reason.trim() : undefined,
  }
}

export function validateKycDecisionPayload(body: any): { valid: boolean; error?: string; userId?: string; action?: string; reason?: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request payload body." }
  }

  const { userId, action, reason } = body
  if (!userId || typeof userId !== "string") {
    return { valid: false, error: "User ID parameter is required." }
  }

  if (!action || typeof action !== "string") {
    return { valid: false, error: "Decision action parameter is required." }
  }

  const normalizedAction = action.toUpperCase().trim()
  if (normalizedAction !== "APPROVE" && normalizedAction !== "REJECT") {
    return { valid: false, error: "Invalid KYC decision. Allowed: APPROVE, REJECT." }
  }

  if (normalizedAction === "REJECT" && (!reason || typeof reason !== "string" || !reason.trim())) {
    return { valid: false, error: "A mandatory rejection reason is required when declining identity verification." }
  }

  return {
    valid: true,
    userId: userId.trim(),
    action: normalizedAction,
    reason: typeof reason === "string" ? reason.trim() : undefined,
  }
}

export function validatePasswordChangePayload(body: any): { valid: boolean; error?: string; currentPassword?: string; newPassword?: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request payload body." }
  }

  const { currentPassword, newPassword } = body
  if (!currentPassword || typeof currentPassword !== "string") {
    return { valid: false, error: "Current password is required." }
  }

  if (!newPassword || typeof newPassword !== "string") {
    return { valid: false, error: "New password is required." }
  }

  if (newPassword.length < 8) {
    return { valid: false, error: "New password must be at least 8 characters long." }
  }

  if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return { valid: false, error: "New password must contain at least one uppercase letter (A-Z) and one number (0-9)." }
  }

  return {
    valid: true,
    currentPassword,
    newPassword,
  }
}

export function validateSearchQuery(queryParam: string | null): string {
  if (!queryParam) return ""
  return queryParam.trim()
}
