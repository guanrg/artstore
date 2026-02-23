"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { emitCartUpdated } from "@/lib/cart-events"
import { getClientDict } from "@/lib/i18n-client"

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
  const [{ t }, setI18n] = useState(getClientDict)
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [promoCode, setPromoCode] = useState("")

  const refresh = async () => {
    const res = await fetch("/api/cart")
    const json = (await res.json()) as { cart?: Cart; message?: string }
    if (!res.ok) {
      setError(json.message ?? t.cart.failedLoad)
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
        setError(json.message ?? t.cart.failedLoad)
      } else {
        setCart(json.cart ?? null)
        setError("")
      }
      setI18n(getClientDict())
      setLoading(false)
    }
    load().catch(() => {
      if (!active) return
      setError(t.cart.failedLoad)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [t.cart.failedLoad])

  const totalQty = useMemo(
    () => (cart?.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
    [cart]
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
      setError(json.message ?? t.cart.failedApply)
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
      setError(json.message ?? t.cart.failedRemove)
      return
    }
    await refresh()
  }

  if (loading) {
    return <main className="p-8">{t.cart.loading}</main>
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950 p-8 text-zinc-100">
      <div className="mx-auto max-w-4xl rounded-2xl border border-[var(--border)] bg-zinc-900/70 p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t.cart.title}</h1>
          <Link href="/" className="text-sm font-medium text-[var(--accent)]">
            {t.cart.continueShopping}
          </Link>
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        {(cart?.items ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500">{t.cart.empty}</p>
        ) : (
          <div className="space-y-3">
            {(cart?.items ?? []).map((item) => (
              <article key={item.id} className="flex gap-4 rounded-xl border border-[var(--border)] p-4">
                <div className="h-20 w-20 overflow-hidden rounded-md bg-zinc-800">
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
                  <p className="font-medium text-zinc-100">{item.title}</p>
                  {item.product_handle || item.product_id ? (
                    <Link
                      href={`/products/${item.product_handle ?? item.product_id ?? ""}`}
                      className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-strong)]"
                    >
                      {t.cart.viewProduct}
                    </Link>
                  ) : null}
                  <p className="text-sm text-zinc-400">{item.variant_title ?? t.cart.variant}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, Math.max(1, item.quantity - 1))}
                      className="rounded border border-[var(--border)] px-2"
                    >
                      -
                    </button>
                    <span className="text-sm">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="rounded border border-[var(--border)] px-2"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="ml-3 text-sm text-rose-400 hover:text-rose-300"
                    >
                      {t.cart.remove}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-zinc-300">
                  {fmt((item.unit_price ?? 0) * item.quantity, cart?.currency_code)}
                </p>
              </article>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-xl bg-zinc-950/70 p-4 text-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder={t.cart.promoPlaceholder}
              className="rounded-md border border-[var(--border)] bg-zinc-900 px-3 py-1.5"
            />
            <button
              type="button"
              onClick={applyPromo}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 hover:border-zinc-500"
            >
              {t.cart.apply}
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
          <p>{t.cart.totalItems}: {totalQty}</p>
          <p>
            {t.cart.subtotal}: {fmt(cart?.subtotal ?? 0, cart?.currency_code)}
          </p>
          <p>
            {t.cart.total}: {fmt(cart?.total ?? 0, cart?.currency_code)}
          </p>
          <Link
            href="/checkout"
            className="mt-3 inline-flex rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-black hover:bg-[var(--accent-strong)]"
          >
            {t.cart.checkout}
          </Link>
        </div>
      </div>
    </main>
  )
}
