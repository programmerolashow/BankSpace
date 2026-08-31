/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ParsedApiError {
  status: number
  code: string
  message: string
  isAuthError: boolean
  isPermissionError: boolean
  isNetworkError: boolean
}

export async function parseAdminApiError(
  responseOrError: Response | any,
  fallbackMessage = "An unexpected error occurred."
): Promise<ParsedApiError> {
  // 1. Handle Network Failure / Fetch Exception
  if (!(responseOrError instanceof Response)) {
    const errorMsg =
      responseOrError instanceof Error
        ? responseOrError.message
        : String(responseOrError || fallbackMessage)

    return {
      status: 0,
      code: "NETWORK_ERROR",
      message: errorMsg.includes("fetch") || errorMsg.includes("Network")
        ? "Unable to connect to BankSpace servers. Please check your network connection."
        : errorMsg,
      isAuthError: false,
      isPermissionError: false,
      isNetworkError: true,
    }
  }

  const status = responseOrError.status
  let code = "UNKNOWN_ERROR"
  let message = fallbackMessage

  try {
    const data = await responseOrError.json().catch(() => ({}))
    if (data.message) message = data.message
    if (data.code) code = data.code
  } catch {
    // Parsing JSON failed fallback
  }

  // Handle Specific Status Codes
  if (status === 401) {
    code = "UNAUTHORIZED"
    message = "Authentication session expired. Please log in again."
    if (typeof window !== "undefined" && !window.location.pathname.includes("/admin/login")) {
      window.location.href = "/admin/login"
    }
  } else if (status === 403) {
    code = "FORBIDDEN"
    message = "Access denied. Administrator privileges required."
  } else if (status === 404) {
    code = "NOT_FOUND"
    message = message || "Requested resource or record was not found."
  } else if (status === 502 || status === 503) {
    code = "SERVICE_UNAVAILABLE"
    message = "Payment provider or database service temporarily unavailable. Please try again."
  }

  return {
    status,
    code,
    message,
    isAuthError: status === 401,
    isPermissionError: status === 403,
    isNetworkError: false,
  }
}
