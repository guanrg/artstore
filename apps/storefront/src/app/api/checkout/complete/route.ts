import { NextResponse } from "next/server"
import {
  CART_ID_COOKIE,
  CUSTOMER_TOKEN_COOKIE,
  createCart,
  medusaRequest,
} from "@/lib/medusa-server"
import { cookies } from "next/headers"

type AddressInput = {
  first_name?: string
  last_name?: string
  address_1?: string
  address_2?: string
  city?: string
  province?: string
  postal_code?: string
  country_code?: string
  phone?: string
}

type CheckoutPayload = {
  email?: string
  shipping_option_id?: string
  payment_provider_id?: string
  shipping_address?: AddressInput
  billing_address?: AddressInput
  billing_same_as_shipping?: boolean
}

type CartResponse = {
  cart: {
    id: string
    region_id: string
    region?: { countries?: Array<{ iso_2: string }> }
    shipping_methods?: Array<{ shipping_option_id?: string }>
    payment_collection?: { id: string }
    items?: Array<{
      id: string
      title?: string
      variant_title?: string
      variant_id?: string
      quantity: number
    }>
  }
}

type VariantResponse = {
  variant: {
    id: string
    title?: string
    manage_inventory?: boolean
    allow_backorder?: boolean
    inventory_quantity?: number
  }
}

function mapCompletionErrorMessage(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes("payment")) {
    return "Payment authorization failed. Please try again or choose another payment method."
  }
  if (lower.includes("inventory") || lower.includes("stock")) {
    return "Some items are out of stock. Please review your cart and try again."
  }
  return "Order could not be completed. Please retry in a moment."
}

async function validateInventoryBeforeComplete(items: CartResponse["cart"]["items"] = []) {
  const variantIds = Array.from(new Set(items.map((item) => item.variant_id).filter(Boolean))) as string[]

  if (variantIds.length === 0) {
    return { ok: true as const }
  }

  const variants = await Promise.all(
    variantIds.map(async (id) => {
      const res = await medusaRequest<VariantResponse>(
        `/store/variants/${id}?fields=id,title,manage_inventory,allow_backorder,inventory_quantity`,
      )
      return { id, res }
    }),
  )

  const failedVariantRequest = variants.find((result) => !result.res.ok)
  if (failedVariantRequest) {
    return {
      ok: false as const,
      status: 503,
      message: "Unable to verify inventory right now. Please retry.",
      issues: [],
    }
  }

  const variantMap = new Map(variants.map((result) => [result.id, result.res.data.variant]))
  const issues: Array<{ line_id: string; variant_id: string; title: string; requested: number; available: number }> = []

  for (const item of items) {
    const variantId = item.variant_id
    if (!variantId) {
      continue
    }

    const variant = variantMap.get(variantId)
    if (!variant) {
      continue
    }

    const manageInventory = variant.manage_inventory !== false
    const allowBackorder = variant.allow_backorder === true
    const available = typeof variant.inventory_quantity === "number" ? variant.inventory_quantity : null

    if (manageInventory && !allowBackorder && available !== null && item.quantity > available) {
      issues.push({
        line_id: item.id,
        variant_id: variantId,
        title: item.title || variant.title || "Item",
        requested: item.quantity,
        available,
      })
    }
  }

  if (issues.length > 0) {
    return {
      ok: false as const,
      status: 409,
      message: "Some items are out of stock. Please reduce quantity and try again.",
      issues,
    }
  }

  return { ok: true as const }
}

export async function POST(req: Request) {
  const body = (await req.json()) as CheckoutPayload
  let cartId = (await cookies()).get(CART_ID_COOKIE)?.value

  if (!cartId) {
    const created = await createCart()
    if (!created.ok) {
      return NextResponse.json({ message: created.message }, { status: 400 })
    }
    cartId = created.cartId
  }

  let cartRes = await medusaRequest<CartResponse>(`/store/carts/${cartId}`)
  if (!cartRes.ok) {
    return NextResponse.json({ message: cartRes.message }, { status: cartRes.status })
  }

  const token = (await cookies()).get(CUSTOMER_TOKEN_COOKIE)?.value
  if (token) {
    await medusaRequest(`/store/carts/${cartId}/customer`, {
      method: "POST",
      token,
      body: {},
    })
  }

  const requestedCountry = (body.shipping_address?.country_code ?? "").toLowerCase()
  const defaultCountry = cartRes.data.cart.region?.countries?.[0]?.iso_2 ?? "au"
  const targetCountry = requestedCountry || defaultCountry

  const countryInCurrentRegion = (cartRes.data.cart.region?.countries ?? []).some(
    (country) => country.iso_2?.toLowerCase() === targetCountry,
  )

  if (!countryInCurrentRegion) {
    const regions = await medusaRequest<{
      regions: Array<{ id: string; countries?: Array<{ iso_2: string }> }>
    }>("/store/regions")

    if (regions.ok) {
      const matchedRegion = regions.data.regions.find((region) =>
        (region.countries ?? []).some((country) => country.iso_2?.toLowerCase() === targetCountry),
      )

      if (matchedRegion) {
        const switched = await medusaRequest<CartResponse>(`/store/carts/${cartId}`, {
          method: "POST",
          body: { region_id: matchedRegion.id },
        })
        if (!switched.ok) {
          return NextResponse.json({ message: switched.message }, { status: switched.status })
        }
        cartRes = switched
      }
    }
  }
  const normalizedShipping = {
    first_name: body.shipping_address?.first_name ?? "",
    last_name: body.shipping_address?.last_name ?? "",
    address_1: body.shipping_address?.address_1 ?? "",
    address_2: body.shipping_address?.address_2 ?? "",
    city: body.shipping_address?.city ?? "",
    province: body.shipping_address?.province ?? "",
    postal_code: body.shipping_address?.postal_code ?? "",
    country_code: targetCountry,
    phone: body.shipping_address?.phone ?? "",
  }

  const normalizedBilling =
    body.billing_same_as_shipping !== false
      ? normalizedShipping
      : {
          first_name: body.billing_address?.first_name ?? normalizedShipping.first_name,
          last_name: body.billing_address?.last_name ?? normalizedShipping.last_name,
          address_1: body.billing_address?.address_1 ?? normalizedShipping.address_1,
          address_2: body.billing_address?.address_2 ?? normalizedShipping.address_2,
          city: body.billing_address?.city ?? normalizedShipping.city,
          province: body.billing_address?.province ?? normalizedShipping.province,
          postal_code: body.billing_address?.postal_code ?? normalizedShipping.postal_code,
          country_code: (body.billing_address?.country_code ?? normalizedShipping.country_code).toLowerCase(),
          phone: body.billing_address?.phone ?? normalizedShipping.phone,
        }

  const updateCart = await medusaRequest<CartResponse>(`/store/carts/${cartId}`, {
    method: "POST",
    body: {
      email: body.email ?? "",
      shipping_address: normalizedShipping,
      billing_address: normalizedBilling,
    },
  })
  if (!updateCart.ok) {
    return NextResponse.json({ message: updateCart.message }, { status: updateCart.status })
  }
  cartRes = updateCart

  let shippingOptionId = body.shipping_option_id
  if (!shippingOptionId) {
    const shippingOptionsRes = await medusaRequest<{ shipping_options: Array<{ id: string }> }>(
      `/store/shipping-options?cart_id=${cartId}`,
    )
    if (shippingOptionsRes.ok) {
      shippingOptionId = shippingOptionsRes.data.shipping_options[0]?.id
    }
  }

  if (!shippingOptionId) {
    return NextResponse.json({ message: "No shipping option available" }, { status: 400 })
  }

  const selectedShipping = cartRes.data.cart.shipping_methods?.[0]?.shipping_option_id
  if (selectedShipping !== shippingOptionId) {
    const setShipping = await medusaRequest<CartResponse>(`/store/carts/${cartId}/shipping-methods`, {
      method: "POST",
      body: { option_id: shippingOptionId },
    })
    if (!setShipping.ok) {
      return NextResponse.json({ message: setShipping.message }, { status: setShipping.status })
    }
    cartRes = setShipping
  }

  const inventoryCheck = await validateInventoryBeforeComplete(cartRes.data.cart.items)
  if (!inventoryCheck.ok) {
    return NextResponse.json(
      { message: inventoryCheck.message, issues: inventoryCheck.issues ?? [] },
      { status: inventoryCheck.status },
    )
  }

  let paymentCollectionId = cartRes.data.cart.payment_collection?.id
  if (!paymentCollectionId) {
    const collection = await medusaRequest<{ payment_collection: { id: string } }>(
      "/store/payment-collections",
      {
        method: "POST",
        body: { cart_id: cartId },
      },
    )
    if (!collection.ok) {
      return NextResponse.json({ message: collection.message }, { status: collection.status })
    }
    paymentCollectionId = collection.data.payment_collection.id
  }

  let providerId = body.payment_provider_id
  if (!providerId) {
    const paymentProvidersRes = await medusaRequest<{ payment_providers: Array<{ id: string }> }>(
      `/store/payment-providers?region_id=${cartRes.data.cart.region_id}`,
    )
    if (paymentProvidersRes.ok) {
      providerId = paymentProvidersRes.data.payment_providers[0]?.id
    }
  }

  if (!providerId) {
    return NextResponse.json({ message: "No payment provider available" }, { status: 400 })
  }

  const setPaymentSession = await medusaRequest<{ payment_collection: { id: string } }>(
    `/store/payment-collections/${paymentCollectionId}/payment-sessions`,
    {
      method: "POST",
      token,
      body: { provider_id: providerId },
    },
  )
  if (!setPaymentSession.ok) {
    return NextResponse.json({ message: setPaymentSession.message }, { status: setPaymentSession.status })
  }

  const completed = await medusaRequest<{
    type: "order" | "cart"
    order?: Record<string, unknown>
    error?: { message?: string }
  }>(`/store/carts/${cartId}/complete`, { method: "POST" })

  if (!completed.ok) {
    return NextResponse.json(
      { message: mapCompletionErrorMessage(completed.message), raw_message: completed.message },
      { status: completed.status },
    )
  }

  if (completed.data.type !== "order") {
    const raw = completed.data.error?.message ?? "Cart could not be completed yet"
    return NextResponse.json(
      { message: mapCompletionErrorMessage(raw), raw_message: raw },
      { status: 400 },
    )
  }

  const res = NextResponse.json(completed.data)
  res.cookies.set(CART_ID_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
  return res
}
