"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function CheckoutSuccessPage() {
  const search = useSearchParams()
  const orderId = search.get("order_id") ?? ""
  const displayId = search.get("display_id") ?? ""

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white p-8">
      <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-widest text-emerald-700">Success</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Order placed</h1>
        <p className="mt-3 text-slate-600">
          Your order has been created successfully.
        </p>

        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm">
          <p>
            <span className="font-medium">Order ID:</span> {orderId || "N/A"}
          </p>
          <p>
            <span className="font-medium">Display ID:</span> {displayId || "N/A"}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/" className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700">
            Back to store
          </Link>
          <Link href="/account" className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700">
            Go to account
          </Link>
          {orderId ? (
            <Link
              href={`/account/orders/${orderId}`}
              className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700"
            >
              View order details
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  )
}
