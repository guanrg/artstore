import { NextResponse } from "next/server"
import { CUSTOMER_TOKEN_COOKIE, medusaRequest } from "@/lib/medusa-server"
import { cookies } from "next/headers"

export async function GET() {
  const token = (await cookies()).get(CUSTOMER_TOKEN_COOKIE)?.value

  if (!token) {
    return NextResponse.json({ customer: null })
  }

  const me = await medusaRequest<{ customer: Record<string, unknown> }>("/store/customers/me", { token })
  if (!me.ok) {
    return NextResponse.json({ customer: null })
  }

  return NextResponse.json({ customer: me.data.customer })
}
