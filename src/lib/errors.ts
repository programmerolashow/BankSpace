/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"

export function apiUnauthorized(message: string = "Authentication required. Please log in.") {
  return NextResponse.json({ message, code: "UNAUTHORIZED" }, { status: 401 })
}

export function apiForbidden(message: string = "You do not have permission to access this resource.") {
  return NextResponse.json({ message, code: "FORBIDDEN" }, { status: 403 })
}

export function apiBadRequest(message: string = "Invalid request details.") {
  return NextResponse.json({ message, code: "BAD_REQUEST" }, { status: 400 })
}

export function apiNotFound(message: string = "Requested resource not found.") {
  return NextResponse.json({ message, code: "NOT_FOUND" }, { status: 404 })
}

export function apiConflict(message: string = "Duplicate request detected.", payload?: any) {
  return NextResponse.json({ message, code: "CONFLICT", ...payload }, { status: 409 })
}

export function apiBadGateway(message: string = "Payment gateway error. Please try again.") {
  return NextResponse.json({ message, code: "BAD_GATEWAY" }, { status: 502 })
}

export function apiServiceUnavailable(message: string = "Service temporarily unavailable. Please try again later.") {
  return NextResponse.json({ message, code: "SERVICE_UNAVAILABLE" }, { status: 503 })
}

export function apiInternalError(err?: unknown) {
  console.error("[Internal Financial Server Error]:", err)
  return NextResponse.json(
    { message: "An unexpected error occurred while processing your request. Please try again.", code: "INTERNAL_ERROR" },
    { status: 500 }
  )
}
