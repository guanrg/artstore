import { NextResponse } from "next/server"
import { CART_ID_COOKIE, createCart, medusaRequest } from "@/lib/medusa-server"
import { cookies } from "next/headers"

type Cart = {
  id: string
  region_id: string
  region?: { countries?: Array<{ iso_2: string }> }
  items?: Array<unknown>
}

export async function GET() {
  let cartId = (await cookies()).get(CART_ID_COOKIE)?.value

  if (!cartId) {
    const created = await createCart()
    if (!created.ok) {
      return NextResponse.json({ message: created.message }, { status: 400 })
    }
    cartId = created.cartId
  }

  let cartRes = await medusaRequest<{ cart: Cart }>(`/store/carts/${cartId}`)
  if (!cartRes.ok) {
    const created = await createCart()
    if (!created.ok) {
      return NextResponse.json({ message: created.message }, { status: 400 })
    }
    cartId = created.cartId
    cartRes = await medusaRequest<{ cart: Cart }>(`/store/carts/${cartId}`)
    if (!cartRes.ok) {
      return NextResponse.json({ message: cartRes.message }, { status: cartRes.status })
    }
  }

  const cartCountries = (cartRes.data.cart.region?.countries ?? []).map((c) => c.iso_2?.toLowerCase())
  const isAuCart = cartRes.data.cart.region_id && cartCountries.includes("au")
  if (!isAuCart) {
    const created = await createCart()
    if (!created.ok) {
      return NextResponse.json({ message: created.message }, { status: 400 })
    }
    cartId = created.cartId
    cartRes = await medusaRequest<{ cart: Cart }>(`/store/carts/${cartId}`)
    if (!cartRes.ok) {
      return NextResponse.json({ message: cartRes.message }, { status: cartRes.status })
    }
  }

  const cart = cartRes.data.cart
  const [shippingOptionsRes, paymentProvidersRes] = await Promise.all([
    medusaRequest<{ shipping_options: Array<{ id: string; name: string; amount?: number }> }>(
      `/store/shipping-options?cart_id=${cart.id}`,
    ),
    medusaRequest<{ payment_providers: Array<{ id: string }> }>(
      `/store/payment-providers?region_id=${cart.region_id}`,
    ),
  ])

  const res = NextResponse.json({
    cart,
    shipping_options: shippingOptionsRes.ok ? shippingOptionsRes.data.shipping_options : [],
    payment_providers: paymentProvidersRes.ok ? paymentProvidersRes.data.payment_providers : [],
    country_code: cart.region?.countries?.[0]?.iso_2 ?? "au",
  })

  res.cookies.set(CART_ID_COOKIE, cart.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
