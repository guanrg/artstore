import { NextResponse } from "next/server"
import { CUSTOMER_TOKEN_COOKIE, medusaRequest } from "@/lib/medusa-server"

export async function POST(req: Request) {
  const body = (await req.json()) as { email?: string; password?: string }
  if (!body.email || !body.password) {
    return NextResponse.json({ message: "Email and password are required" }, { status: 400 })
  }

  const auth = await medusaRequest<{ token: string }>("/auth/customer/emailpass", {
    method: "POST",
    body: { email: body.email, password: body.password },
  })

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status })
  }

  const session = await medusaRequest<{ user?: { actor_type?: string } }>("/auth/session", {
    method: "POST",
    token: auth.data.token,
  })

  if (!session.ok) {
    return NextResponse.json({ message: session.message }, { status: session.status })
  }

  const actorType = session.data.user?.actor_type
  if (actorType && actorType !== "customer") {
    return NextResponse.json({ message: "Only customer accounts can log in here" }, { status: 403 })
  }

  const me = await medusaRequest<{ customer: { id: string; email: string; first_name?: string; last_name?: string } }>(
    "/store/customers/me",
    { token: auth.data.token },
  )

  if (!me.ok) {
    return NextResponse.json({ message: me.message }, { status: me.status })
  }

  const res = NextResponse.json({ customer: me.data.customer })
  res.cookies.set(CUSTOMER_TOKEN_COOKIE, auth.data.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
