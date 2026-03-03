import { NextResponse } from "next/server"
import { medusaRequest } from "@/lib/medusa-server"
import { getRateLimitKey, isRateLimited } from "@/lib/rate-limit"

type ResetBody = {
  token?: string
  password?: string
  confirm_password?: string
}

export async function POST(req: Request) {
  const rateKey = getRateLimitKey(req, "auth-password-reset")
  if (
    isRateLimited(rateKey, {
      maxRequests: 8,
      windowMs: 60_000,
    })
  ) {
    return NextResponse.json({ message: "Too many attempts. Please try again shortly." }, { status: 429 })
  }

  const body = (await req.json()) as ResetBody
  const token = (body.token ?? "").trim()
  const password = body.password ?? ""
  const confirmPassword = body.confirm_password ?? ""

  if (!token || !password) {
    return NextResponse.json({ message: "Token and password are required." }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ message: "Password must be at least 8 characters." }, { status: 400 })
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ message: "Passwords do not match." }, { status: 400 })
  }

  const updatePassword = await medusaRequest<{ success: boolean }>("/auth/customer/emailpass/update", {
    method: "POST",
    token,
    body: { password },
  })

  if (!updatePassword.ok) {
    return NextResponse.json({ message: "Reset token is invalid or expired." }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
