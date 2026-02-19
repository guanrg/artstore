import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { CUSTOMER_TOKEN_COOKIE, medusaRequest } from "@/lib/medusa-server"

export async function GET() {
  const token = (await cookies()).get(CUSTOMER_TOKEN_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ orders: [] })
  }

  const orders = await medusaRequest<{ orders: Array<Record<string, unknown>> }>("/store/orders", {
    token,
  })

  if (!orders.ok) {
    return NextResponse.json({ message: orders.message }, { status: orders.status })
  }

  return NextResponse.json(orders.data)
}
