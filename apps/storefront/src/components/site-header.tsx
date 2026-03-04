"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { onCartUpdated } from "@/lib/cart-events"
import { dict, normalizeLocale, type Locale } from "@/lib/i18n-dict"

type Customer = { email?: string; first_name?: string; last_name?: string } | null

type SiteHeaderProps = {
  initialLocale: Locale
}

export function SiteHeader({ initialLocale }: SiteHeaderProps) {
  const pathname = usePathname()
  const [customer, setCustomer] = useState<Customer>(null)
  const [cartCount, setCartCount] = useState(0)
  const [{ locale, t }, setI18n] = useState(() => ({
    locale: initialLocale,
    t: dict[initialLocale],
  }))

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

  const changeLocale = async (nextLocale: string) => {
    const localeValue = normalizeLocale(nextLocale)
    await fetch("/api/locale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: localeValue }),
    })
    setI18n({ locale: localeValue, t: dict[localeValue] })
    window.location.reload()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-700 bg-zinc-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-1.5">
        <Link href="/" className="group rounded-md px-2 py-1">
          <Image
            src="/logo-art-studio.svg"
            alt="Art Studio"
            width={200}
            height={52}
            className="h-auto w-[200px]"
            priority
          />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-300">
            {t.header.localeLabel}
            <select
              value={locale}
              onChange={(e) => changeLocale(e.target.value)}
              className="rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
            >
              <option value="en">EN</option>
              <option value="zh">中文</option>
            </select>
          </label>
          <Link href="/cart" className="font-semibold text-zinc-200 transition hover:text-[var(--accent-strong)]">
            {t.header.cart} ({cartCount})
          </Link>
          <Link href="/categories" className="font-semibold text-zinc-200 transition hover:text-[var(--accent-strong)]">
            Categories
          </Link>
          {customer ? (
            <>
              <Link href="/account" className="font-semibold text-zinc-200 transition hover:text-[var(--accent-strong)]">
                {customer.first_name || customer.email || t.header.account}
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-md border border-zinc-600 px-3 py-1.5 font-semibold text-zinc-200 transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
              >
                {t.header.logout}
              </button>
            </>
          ) : (
            <>
              <Link href="/account/login" className="font-semibold text-zinc-200 transition hover:text-[var(--accent-strong)]">
                {t.header.login}
              </Link>
              <Link
                href="/account/register"
                className="rounded-md bg-[var(--accent)] px-3 py-1.5 font-medium text-zinc-950 transition hover:bg-[var(--accent-strong)]"
              >
                {t.header.register}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
