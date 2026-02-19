"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { emitCartUpdated } from "@/lib/cart-events"

type CartItem = {
  id: string
  title: string
  variant_title?: string
  quantity: number
  unit_price?: number
  thumbnail?: string
  product_handle?: string
  product_id?: string
}

type Cart = {
  id: string
  items?: CartItem[]
  currency_code?: string
  total?: number
  subtotal?: number
  promotions?: Array<{ id: string; code?: string }>
}

function fmt(amount: number, currencyCode?: string) {
  if ((currencyCode ?? "").toLowerCase() === "aud") {
    return `$ ${amount}`
  }
  return `${amount} ${currencyCode ?? ""}`.trim()
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [promoCode, setPromoCode] = useState("")

  const refresh = async () => {
    const res = await fetch("/api/cart")
    const json = (await res.json()) as { cart?: Cart; message?: string }
    if (!res.ok) {
      setError(json.message ?? "Failed to load cart")
      return
    }
    setCart(json.cart ?? null)
    setError("")
    emitCartUpdated()
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      const res = await fetch("/api/cart")
      const json = (await res.json()) as { cart?: Cart; message?: string }
      if (!active) return
      if (!res.ok) {
        setError(json.message ?? "Failed to load cart")
      } else {
        setCart(json.cart ?? null)
        setError("")
      }
      setLoading(false)
    }
    load().catch(() => {
      if (!active) return
      setError("Failed to load cart")
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const totalQty = useMemo(
    () => (cart?.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  )

  const updateQty = async (lineId: string, quantity: number) => {
    const res = await fetch(`/api/cart/line-items/${lineId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quantity }),
    })
    if (!res.ok) return
    await refresh()
  }

  const remove = async (lineId: string) => {
    const res = await fetch(`/api/cart/line-items/${lineId}`, { method: "DELETE" })
    if (!res.ok) return
    await refresh()
  }

  const applyPromo = async () => {
    const code = promoCode.trim()
    if (!code) return
    const res = await fetch("/api/cart/promotions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    })
    const json = (await res.json()) as { message?: string }
    if (!res.ok) {
      setError(json.message ?? "Failed to apply promo code")
      return
    }
    setPromoCode("")
    await refresh()
  }

  const removePromo = async (code: string) => {
    const res = await fetch("/api/cart/promotions", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    })
    const json = (await res.json()) as { message?: string }
    if (!res.ok) {
      setError(json.message ?? "Failed to remove promo code")
      return
    }
    await refresh()
  }

  if (loading) {
    return <main className="p-8">Loading cart...</main>
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-8">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Cart</h1>
          <Link href="/" className="text-sm font-medium text-orange-700">
            Continue shopping
          </Link>
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        {(cart?.items ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">Your cart is empty.</p>
        ) : (
          <div className="space-y-3">
            {(cart?.items ?? []).map((item) => (
              <article key={item.id} className="flex gap-4 rounded-xl border border-slate-200 p-4">
                <div className="h-20 w-20 overflow-hidden rounded-md bg-slate-100">
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.title}
                      width={120}
                      height={120}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">
                    {item.title}
                  </p>
                  {item.product_handle || item.product_id ? (
                    <Link
                      href={`/products/${item.product_handle ?? item.product_id ?? ""}`}
                      className="text-xs font-medium text-orange-700 hover:text-orange-900"
                    >
                      View product
                    </Link>
                  ) : null}
                  <p className="text-sm text-slate-600">{item.variant_title ?? "Variant"}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, Math.max(1, item.quantity - 1))}
                      className="rounded border border-slate-300 px-2"
                    >
                      -
                    </button>
                    <span className="text-sm">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="rounded border border-slate-300 px-2"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="ml-3 text-sm text-rose-600 hover:text-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-700">
                  {fmt((item.unit_price ?? 0) * item.quantity, cart?.currency_code)}
                </p>
              </article>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Promo code"
              className="rounded-md border border-slate-300 px-3 py-1.5"
            />
            <button
              type="button"
              onClick={applyPromo}
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:border-slate-400"
            >
              Apply
            </button>
          </div>
          {(cart?.promotions ?? []).length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {(cart?.promotions ?? []).map((promo) => (
                <button
                  key={promo.id}
                  type="button"
                  onClick={() => removePromo(promo.code ?? "")}
                  className="rounded-md bg-emerald-100 px-2 py-1 text-xs text-emerald-800"
                >
                  {promo.code ?? promo.id} x
                </button>
              ))}
            </div>
          ) : null}
          <p>Total items: {totalQty}</p>
          <p>
            Subtotal: {fmt(cart?.subtotal ?? 0, cart?.currency_code)}
          </p>
          <p>
            Total: {fmt(cart?.total ?? 0, cart?.currency_code)}
          </p>
          <Link
            href="/checkout"
            className="mt-3 inline-flex rounded-md bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700"
          >
            Proceed to checkout
          </Link>
        </div>
      </div>
    </main>
  )
}
