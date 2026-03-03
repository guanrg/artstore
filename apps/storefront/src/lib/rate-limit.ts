type RateLimitBucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitBucket>()

function now() {
  return Date.now()
}

function getIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown"
  }
  return (
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("true-client-ip") ||
    "unknown"
  )
}

export function getRateLimitKey(req: Request, scope: string) {
  const ip = getIpFromHeaders(req.headers)
  return `${scope}:${ip}`
}

export function isRateLimited(
  key: string,
  {
    maxRequests,
    windowMs,
  }: {
    maxRequests: number
    windowMs: number
  }
) {
  const current = now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= current) {
    buckets.set(key, { count: 1, resetAt: current + windowMs })
    return false
  }

  if (bucket.count >= maxRequests) {
    return true
  }

  bucket.count += 1
  buckets.set(key, bucket)
  return false
}
