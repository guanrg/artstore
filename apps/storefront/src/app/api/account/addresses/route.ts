import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { CUSTOMER_TOKEN_COOKIE, medusaRequest } from "@/lib/medusa-server"

export async function GET() {
  const token = (await cookies()).get(CUSTOMER_TOKEN_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ addresses: [] })
  }

  const list = await medusaRequest<{ addresses: Array<Record<string, unknown>> }>(
    "/store/customers/me/addresses",
    { token },
  )
  if (!list.ok) {
    return NextResponse.json({ message: list.message }, { status: list.status })
  }
  return NextResponse.json(list.data)
}

export async function POST(req: Request) {
  const token = (await cookies()).get(CUSTOMER_TOKEN_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ message: "Not logged in" }, { status: 401 })
  }

  const body = (await req.json()) as Record<string, unknown>
  const created = await medusaRequest<{ customer: Record<string, unknown> }>(
    "/store/customers/me/addresses",
    {
      method: "POST",
      token,
      body: body as Record<string, string | number | boolean | null>,
    },
  )
  if (!created.ok) {
    return NextResponse.json({ message: created.message }, { status: created.status })
  }
  return NextResponse.json(created.data)
}
