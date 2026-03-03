import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { CUSTOMER_TOKEN_COOKIE, medusaRequest } from "@/lib/medusa-server"
import { getRateLimitKey, isRateLimited } from "@/lib/rate-limit"

type PasswordBody = {
  current_password?: string
  new_password?: string
}

export async function POST(req: Request) {
  const rateKey = getRateLimitKey(req, "auth-change-password")
  if (
    isRateLimited(rateKey, {
      maxRequests: 8,
      windowMs: 60_000,
    })
  ) {
    return NextResponse.json({ message: "Too many attempts. Please try again shortly." }, { status: 429 })
  }

  const token = (await cookies()).get(CUSTOMER_TOKEN_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ message: "Please log in first." }, { status: 401 })
  }

  const body = (await req.json()) as PasswordBody
  const currentPassword = body.current_password ?? ""
  const newPassword = body.new_password ?? ""

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ message: "Current and new password are required." }, { status: 400 })
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ message: "New password must be at least 8 characters." }, { status: 400 })
  }

  const me = await medusaRequest<{ customer: { email?: string } }>("/store/customers/me", { token })
  if (!me.ok) {
    return NextResponse.json({ message: "Unable to verify account." }, { status: 400 })
  }

  const email = me.data.customer?.email ?? ""
  if (!email) {
    return NextResponse.json({ message: "Unable to verify account." }, { status: 400 })
  }

  const verifyCurrent = await medusaRequest<{ token: string }>("/auth/customer/emailpass", {
    method: "POST",
    body: { email, password: currentPassword },
  })

  if (!verifyCurrent.ok) {
    return NextResponse.json({ message: "Current password is incorrect." }, { status: 400 })
  }

  const updatePassword = await medusaRequest<{ success: boolean }>("/auth/customer/emailpass/update", {
    method: "POST",
    token,
    body: { password: newPassword },
  })

  if (!updatePassword.ok) {
    return NextResponse.json({ message: "Failed to update password." }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
