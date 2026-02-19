import { NextResponse } from "next/server"
import { CART_ID_COOKIE, medusaRequest } from "@/lib/medusa-server"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  const cartId = (await cookies()).get(CART_ID_COOKIE)?.value
  if (!cartId) {
    return NextResponse.json({ message: "Cart not found" }, { status: 404 })
  }

  const body = (await req.json()) as { code?: string }
  const code = (body.code ?? "").trim()
  if (!code) {
    return NextResponse.json({ message: "Promo code is required" }, { status: 400 })
  }

  const applied = await medusaRequest<{ cart: Record<string, unknown> }>(`/store/carts/${cartId}/promotions`, {
    method: "POST",
    body: { promo_codes: [code] },
  })

  if (!applied.ok) {
    return NextResponse.json({ message: applied.message }, { status: applied.status })
  }

  return NextResponse.json(applied.data)
}

export async function DELETE(req: Request) {
  const cartId = (await cookies()).get(CART_ID_COOKIE)?.value
  if (!cartId) {
    return NextResponse.json({ message: "Cart not found" }, { status: 404 })
  }

  const body = (await req.json()) as { code?: string }
  const code = (body.code ?? "").trim()
  if (!code) {
    return NextResponse.json({ message: "Promo code is required" }, { status: 400 })
  }

  const removed = await medusaRequest<{ cart: Record<string, unknown> }>(`/store/carts/${cartId}/promotions`, {
    method: "DELETE",
    body: { promo_codes: [code] },
  })

  if (!removed.ok) {
    return NextResponse.json({ message: removed.message }, { status: removed.status })
  }

  return NextResponse.json(removed.data)
}
