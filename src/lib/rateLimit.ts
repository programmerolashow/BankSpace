type RateLimitRecord = {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitRecord>()

export function checkRateLimit(
  identifier: string,
  limit: number = 5,
  windowMs: number = 15 * 60 * 1000
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs
    rateLimitMap.set(identifier, { count: 1, resetTime })
    return { success: true, remaining: limit - 1, resetTime }
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, resetTime: record.resetTime }
  }

  record.count += 1
  rateLimitMap.set(identifier, record)
  return { success: true, remaining: limit - record.count, resetTime: record.resetTime }
}

export function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get("x-forwarded-for")
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim()
  }
  return request.headers.get("x-real-ip") || "127.0.0.1"
}
