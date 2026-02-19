"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { onCartUpdated } from "@/lib/cart-events"

type Customer = { email?: string; first_name?: string; last_name?: string } | null

export function SiteHeader() {
  const pathname = usePathname()
  const [customer, setCustomer] = useState<Customer>(null)
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      const [meRes, cartRes] = await Promise.all([fetch("/api/auth/me"), fetch("/api/cart")])
      if (meRes.ok) {
        const me = (await meRes.json()) as { customer: Customer }
        setCustomer(me.customer)
      }
      if (cartRes.ok) {
        const cart = (await cartRes.json()) as { cart?: { items?: Array<{ quantity: number }> } }
        const total = (cart.cart?.items ?? []).reduce((sum, item) => sum + item.quantity, 0)
        setCartCount(total)
      }
    }
    load().catch(() => undefined)
    const offCartUpdate = onCartUpdated(() => {
      load().catch(() => undefined)
    })
    return () => offCartUpdate()
  }, [pathname])

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/"
  }

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold text-slate-900">
          Medusa Store
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/cart" className="font-medium text-slate-700 hover:text-orange-700">
            Cart ({cartCount})
          </Link>
          {customer ? (
            <>
              <Link href="/account" className="font-medium text-slate-700 hover:text-orange-700">
                {customer.first_name || customer.email || "Account"}
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:border-slate-400"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/account/login" className="font-medium text-slate-700 hover:text-orange-700">
                Login
              </Link>
              <Link
                href="/account/register"
                className="rounded-md bg-orange-600 px-3 py-1.5 font-medium text-white hover:bg-orange-700"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
