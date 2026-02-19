import { NextResponse } from "next/server"
import { CART_ID_COOKIE, createCart, medusaRequest } from "@/lib/medusa-server"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  const body = (await req.json()) as { variant_id?: string; quantity?: number }
  if (!body.variant_id) {
    return NextResponse.json({ message: "variant_id is required" }, { status: 400 })
  }

  let cartId = (await cookies()).get(CART_ID_COOKIE)?.value
  if (!cartId) {
    const created = await createCart()
    if (!created.ok) {
      return NextResponse.json({ message: created.message }, { status: 400 })
    }
    cartId = created.cartId
  }

  const currentCart = await medusaRequest<{
    cart: { id: string; currency_code?: string; region?: { countries?: Array<{ iso_2: string }> } }
  }>(`/store/carts/${cartId}`)
  if (currentCart.ok) {
    const countryCodes = (currentCart.data.cart.region?.countries ?? []).map((c) => c.iso_2?.toLowerCase())
    const isAuCart = currentCart.data.cart.currency_code?.toLowerCase() === "aud" || countryCodes.includes("au")
    if (!isAuCart) {
      const created = await createCart()
      if (!created.ok) {
        return NextResponse.json({ message: created.message }, { status: 400 })
      }
      cartId = created.cartId
    }
  }

  let add = await medusaRequest<{ cart: Record<string, unknown> }>(`/store/carts/${cartId}/line-items`, {
    method: "POST",
    body: {
      variant_id: body.variant_id,
      quantity: body.quantity ?? 1,
    },
  })

  if (!add.ok && add.status === 404) {
    const created = await createCart()
    if (!created.ok) {
      return NextResponse.json({ message: created.message }, { status: 400 })
    }
    cartId = created.cartId
    add = await medusaRequest<{ cart: Record<string, unknown> }>(`/store/carts/${cartId}/line-items`, {
      method: "POST",
      body: {
        variant_id: body.variant_id,
        quantity: body.quantity ?? 1,
      },
    })
  }

  if (!add.ok) {
    return NextResponse.json({ message: add.message }, { status: add.status })
  }

  const res = NextResponse.json(add.data)
  res.cookies.set(CART_ID_COOKIE, cartId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
