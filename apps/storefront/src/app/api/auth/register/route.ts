import { NextResponse } from "next/server"
import { CUSTOMER_TOKEN_COOKIE, medusaRequest } from "@/lib/medusa-server"

export async function POST(req: Request) {
  const body = (await req.json()) as {
    email?: string
    password?: string
    first_name?: string
    last_name?: string
  }

  if (!body.email || !body.password) {
    return NextResponse.json({ message: "Email and password are required" }, { status: 400 })
  }

  const register = await medusaRequest<{ token: string }>("/auth/customer/emailpass/register", {
    method: "POST",
    body: {
      email: body.email,
      password: body.password,
    },
  })

  if (!register.ok) {
    return NextResponse.json({ message: register.message }, { status: register.status })
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
    return NextResponse.json({ message: createCustomer.message }, { status: createCustomer.status })
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
