"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

type OrderItem = {
  id: string
  title?: string
  variant_title?: string
  quantity?: number
  unit_price?: number
}

type Order = {
  id: string
  display_id?: number
  status?: string
  currency_code?: string
  total?: number
  subtotal?: number
  email?: string
  items?: OrderItem[]
}

function fmt(amount: number, currencyCode?: string) {
  if ((currencyCode ?? "").toLowerCase() === "aud") {
    return `$ ${amount}`
  }
  return `${amount} ${currencyCode ?? ""}`.trim()
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const load = async () => {
      const { id } = await params
      const res = await fetch(`/api/account/orders/${id}`)
      const json = (await res.json()) as { order?: Order; message?: string }
      if (!res.ok) {
        setError(json.message ?? "Failed to load order")
        return
      }
      setOrder(json.order ?? null)
    }
    load().catch(() => setError("Failed to load order"))
  }, [params])

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-8">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link href="/account" className="text-sm font-medium text-orange-700">
          Back to account
        </Link>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        {!error && !order ? <p className="mt-3 text-sm text-slate-500">Loading...</p> : null}
        {order ? (
          <>
            <h1 className="mt-3 text-2xl font-bold">Order #{order.display_id ?? order.id}</h1>
            <p className="mt-1 text-sm text-slate-600">Status: {order.status ?? "N/A"}</p>
            <p className="text-sm text-slate-600">Email: {order.email ?? "-"}</p>
            <p className="text-sm text-slate-600">
              Total: {fmt(order.total ?? 0, order.currency_code)}
            </p>

            <section className="mt-5 space-y-2">
              <h2 className="text-lg font-semibold">Items</h2>
              {(order.items ?? []).map((item) => (
                <article key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-medium">{item.title ?? "Item"}</p>
                  <p className="text-slate-600">{item.variant_title ?? "Variant"}</p>
                  <p className="text-slate-600">
                    Qty: {item.quantity ?? 0} | Unit: {item.unit_price ?? 0}
                  </p>
                </article>
              ))}
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}
