"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function CheckoutSuccessPage() {
  const search = useSearchParams()
  const orderId = search.get("order_id") ?? ""
  const displayId = search.get("display_id") ?? ""

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 p-8">
      <div className="mx-auto max-w-2xl rounded-lg border border-emerald-700 bg-zinc-900 p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-widest text-emerald-300">Success</p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-100">Order placed</h1>
        <p className="mt-3 text-zinc-400">
          Your order has been created successfully.
        </p>

        <div className="mt-5 rounded-xl bg-zinc-800/70 p-4 text-sm">
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
          <Link href="/account" className="rounded-md border border-zinc-600 px-4 py-2 font-medium text-zinc-300">
            Go to account
          </Link>
          {orderId ? (
            <Link
              href={`/account/orders/${orderId}`}
              className="rounded-md border border-zinc-600 px-4 py-2 font-medium text-zinc-300"
            >
              View order details
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  )
}
