import { NextResponse } from "next/server"
import { medusaRequest } from "@/lib/medusa-server"
import { getRateLimitKey, isRateLimited } from "@/lib/rate-limit"

type RequestBody = {
  email?: string
}

export async function POST(req: Request) {
  const rateKey = getRateLimitKey(req, "auth-password-request")
  if (
    isRateLimited(rateKey, {
      maxRequests: 8,
      windowMs: 60_000,
    })
  ) {
    return NextResponse.json({ message: "Too many attempts. Please try again shortly." }, { status: 429 })
  }

  const body = (await req.json()) as RequestBody
  const email = (body.email ?? "").trim()
  if (!email) {
    return NextResponse.json({ message: "Email is required." }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000"
  const resetUrl = `${siteUrl}/account/reset-password`

  await medusaRequest("/auth/customer/emailpass/reset-password", {
    method: "POST",
    body: {
      identifier: email,
      metadata: resetUrl ? { reset_url: resetUrl } : {},
    },
  })

  return NextResponse.json({
    success: true,
    message: "If this email exists, a reset link will be sent.",
  })
}
