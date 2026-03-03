import { NextResponse } from "next/server"
import { CUSTOMER_TOKEN_COOKIE, medusaRequest } from "@/lib/medusa-server"
import { getRateLimitKey, isRateLimited } from "@/lib/rate-limit"

export async function POST(req: Request) {
  const rateKey = getRateLimitKey(req, "auth-register")
  if (
    isRateLimited(rateKey, {
      maxRequests: 8,
      windowMs: 60_000,
    })
  ) {
    return NextResponse.json({ message: "Too many attempts. Please try again shortly." }, { status: 429 })
  }

  const body = (await req.json()) as {
    email?: string
    password?: string
    confirm_password?: string
    first_name?: string
    last_name?: string
  }

  if (!body.email || !body.password) {
    return NextResponse.json({ message: "Email and password are required" }, { status: 400 })
  }

  if (body.confirm_password !== undefined && body.password !== body.confirm_password) {
    return NextResponse.json({ message: "Passwords do not match" }, { status: 400 })
  }

  const register = await medusaRequest<{ token: string }>("/auth/customer/emailpass/register", {
    method: "POST",
    body: {
      email: body.email,
      password: body.password,
    },
  })

  if (!register.ok) {
    return NextResponse.json({ message: "Unable to create account with the provided information." }, { status: 400 })
  }

  const createCustomer = await medusaRequest<{
    customer: { id: string; email: string; first_name?: string; last_name?: string }
  }>("/store/customers", {
    method: "POST",
    token: register.data.token,
    body: {
      email: body.email,
      first_name: body.first_name ?? "",
      last_name: body.last_name ?? "",
    },
  })

  if (!createCustomer.ok) {
    return NextResponse.json({ message: "Unable to create account with the provided information." }, { status: 400 })
  }

  const res = NextResponse.json({ customer: createCustomer.data.customer })
  res.cookies.set(CUSTOMER_TOKEN_COOKIE, register.data.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
