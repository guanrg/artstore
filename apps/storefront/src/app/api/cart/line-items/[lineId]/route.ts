import { NextResponse } from "next/server"
import { CART_ID_COOKIE, medusaRequest } from "@/lib/medusa-server"
import { cookies } from "next/headers"

export async function PATCH(req: Request, { params }: { params: Promise<{ lineId: string }> }) {
  const { lineId } = await params
  const cartId = (await cookies()).get(CART_ID_COOKIE)?.value
  if (!cartId) {
    return NextResponse.json({ message: "Cart not found" }, { status: 404 })
  }

  const body = (await req.json()) as { quantity?: number }
  if (!body.quantity || body.quantity < 1) {
    return NextResponse.json({ message: "quantity must be >= 1" }, { status: 400 })
  }

  const updated = await medusaRequest<{ cart: Record<string, unknown> }>(
    `/store/carts/${cartId}/line-items/${lineId}`,
    {
      method: "POST",
      body: { quantity: body.quantity },
    },
  )

  if (!updated.ok) {
    return NextResponse.json({ message: updated.message }, { status: updated.status })
  }

  return NextResponse.json(updated.data)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ lineId: string }> }) {
  const { lineId } = await params
  const cartId = (await cookies()).get(CART_ID_COOKIE)?.value
  if (!cartId) {
    return NextResponse.json({ message: "Cart not found" }, { status: 404 })
  }

  const updated = await medusaRequest<{ cart: Record<string, unknown> }>(
    `/store/carts/${cartId}/line-items/${lineId}`,
    { method: "DELETE" },
  )

  if (!updated.ok) {
    return NextResponse.json({ message: updated.message }, { status: updated.status })
  }

  return NextResponse.json(updated.data)
}
