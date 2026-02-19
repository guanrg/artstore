"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

type Customer = {
  email?: string
  first_name?: string
  last_name?: string
}

type Order = {
  id: string
  display_id?: number
  created_at?: string
  status?: string
  total?: number
  currency_code?: string
}

function fmt(amount: number, currencyCode?: string) {
  if ((currencyCode ?? "").toLowerCase() === "aud") {
    return `$ ${amount}`
  }
  return `${amount} ${currencyCode ?? ""}`.trim()
}

export default function AccountPage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [meRes, orderRes] = await Promise.all([fetch("/api/auth/me"), fetch("/api/account/orders")])
      if (meRes.ok) {
        const me = (await meRes.json()) as { customer: Customer | null }
        setCustomer(me.customer)
      }
      if (orderRes.ok) {
        const data = (await orderRes.json()) as { orders?: Order[] }
        setOrders(data.orders ?? [])
      }
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <main className="p-8">Loading...</main>
  }

  if (!customer) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Account</h1>
          <p className="mt-2 text-slate-600">You are not logged in.</p>
          <Link href="/account/login" className="mt-4 inline-flex font-medium text-orange-700">
            Go to login
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">My Account</h1>
          <p className="mt-2 text-slate-600">
            {customer.first_name} {customer.last_name} ({customer.email})
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">My Orders</h2>
          {(orders ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No orders yet.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {orders.map((order) => (
                <article key={order.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-medium">Order #{order.display_id ?? order.id}</p>
                  <p className="text-slate-600">Status: {order.status ?? "N/A"}</p>
                  <p className="text-slate-600">
                    Total: {fmt(order.total ?? 0, order.currency_code)}
                  </p>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="mt-1 inline-flex font-medium text-orange-700 hover:text-orange-900"
                  >
                    View details
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Address Book</h2>
          <Link href="/account/addresses" className="mt-2 inline-flex text-sm font-medium text-orange-700">
            Manage addresses
          </Link>
        </section>
      </div>
    </main>
  )
}
