import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { CUSTOMER_TOKEN_COOKIE, medusaRequest } from "@/lib/medusa-server"

type UpdateProfileBody = {
  first_name?: string
  last_name?: string
  phone?: string
}

export async function GET() {
  const token = (await cookies()).get(CUSTOMER_TOKEN_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ message: "Not logged in" }, { status: 401 })
  }

  const me = await medusaRequest<{ customer: Record<string, unknown> }>("/store/customers/me", { token })
  if (!me.ok) {
    return NextResponse.json({ message: me.message }, { status: me.status })
  }

  return NextResponse.json({ customer: me.data.customer })
}

export async function POST(req: Request) {
  const token = (await cookies()).get(CUSTOMER_TOKEN_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ message: "Not logged in" }, { status: 401 })
  }

  const body = (await req.json()) as UpdateProfileBody

  const updated = await medusaRequest<{ customer: Record<string, unknown> }>("/store/customers/me", {
    method: "POST",
    token,
    body: {
      first_name: body.first_name ?? "",
      last_name: body.last_name ?? "",
      phone: body.phone ?? "",
    },
  })

  if (!updated.ok) {
    return NextResponse.json({ message: updated.message }, { status: updated.status })
  }

  return NextResponse.json({ customer: updated.data.customer })
}
