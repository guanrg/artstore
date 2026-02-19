import { NextResponse } from "next/server"
import { CART_ID_COOKIE, createCart, medusaRequest } from "@/lib/medusa-server"
import { cookies } from "next/headers"

export async function GET() {
  let cartId = (await cookies()).get(CART_ID_COOKIE)?.value

  if (!cartId) {
    const created = await createCart()
    if (!created.ok) {
      return NextResponse.json({ message: created.message }, { status: 400 })
    }
    cartId = created.cartId
  }

  let cart = await medusaRequest<{
    cart: { id: string; currency_code?: string; region?: { countries?: Array<{ iso_2: string }> } }
  }>(`/store/carts/${cartId}`)
  if (!cart.ok) {
    const created = await createCart()
    if (!created.ok) {
      return NextResponse.json({ message: created.message }, { status: 400 })
    }
    cartId = created.cartId
    cart = await medusaRequest<{ cart: Record<string, unknown> }>(`/store/carts/${cartId}`)
    if (!cart.ok) {
      return NextResponse.json({ message: cart.message }, { status: cart.status })
    }
  }

  const countryCodes = (cart.data.cart.region?.countries ?? []).map((c) => c.iso_2?.toLowerCase())
  const isAuCart = cart.data.cart.currency_code?.toLowerCase() === "aud" || countryCodes.includes("au")
  if (!isAuCart) {
    const created = await createCart()
    if (!created.ok) {
      return NextResponse.json({ message: created.message }, { status: 400 })
    }
    cartId = created.cartId
    cart = await medusaRequest<{
      cart: { id: string; currency_code?: string; region?: { countries?: Array<{ iso_2: string }> } }
    }>(`/store/carts/${cartId}`)
    if (!cart.ok) {
      return NextResponse.json({ message: cart.message }, { status: cart.status })
    }
  }

  const res = NextResponse.json(cart.data)
  res.cookies.set(CART_ID_COOKIE, cartId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
