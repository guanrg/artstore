import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { CUSTOMER_TOKEN_COOKIE, medusaRequest } from "@/lib/medusa-server"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = (await cookies()).get(CUSTOMER_TOKEN_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ message: "Not logged in" }, { status: 401 })
  }

  const order = await medusaRequest<{ order: Record<string, unknown> }>(`/store/orders/${id}`, {
    token,
  })
  if (!order.ok) {
    return NextResponse.json({ message: order.message }, { status: order.status })
  }
  return NextResponse.json(order.data)
}
