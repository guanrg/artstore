"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

type Customer = {
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
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
  const [profilePending, setProfilePending] = useState(false)
  const [profileMessage, setProfileMessage] = useState("")
  const [passwordPending, setPasswordPending] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState("")
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    phone: "",
  })
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })

  useEffect(() => {
    const load = async () => {
      const [meRes, orderRes] = await Promise.all([fetch("/api/auth/me"), fetch("/api/account/orders")])
      if (meRes.ok) {
        const me = (await meRes.json()) as { customer: Customer | null }
        setCustomer(me.customer)
        setProfile({
          first_name: me.customer?.first_name ?? "",
          last_name: me.customer?.last_name ?? "",
          phone: me.customer?.phone ?? "",
        })
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
      <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 p-8">
        <div className="mx-auto max-w-3xl rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Account</h1>
          <p className="mt-2 text-zinc-400">You are not logged in.</p>
          <Link href="/account/login" className="mt-4 inline-flex font-medium text-orange-700">
            Go to login
          </Link>
        </div>
      </main>
    )
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfilePending(true)
    setProfileMessage("")

    const res = await fetch("/api/account/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(profile),
    })
    const json = (await res.json()) as { message?: string; customer?: Customer }

    if (!res.ok) {
      setProfileMessage(json.message ?? "Failed to update profile")
      setProfilePending(false)
      return
    }

    setCustomer((prev) => ({
      ...(prev ?? {}),
      first_name: json.customer?.first_name ?? profile.first_name,
      last_name: json.customer?.last_name ?? profile.last_name,
      phone: json.customer?.phone ?? profile.phone,
      email: prev?.email,
    }))
    setProfileMessage("Profile updated")
    setProfilePending(false)
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage("")

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMessage("New passwords do not match")
      return
    }

    setPasswordPending(true)
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      }),
    })
    const json = (await res.json()) as { message?: string }

    if (!res.ok) {
      setPasswordMessage(json.message ?? "Failed to change password")
      setPasswordPending(false)
      return
    }

    setPasswordForm({
      current_password: "",
      new_password: "",
      confirm_password: "",
    })
    setPasswordMessage("Password updated")
    setPasswordPending(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-zinc-100">My Account</h1>
          <p className="mt-2 text-zinc-400">
            {customer.first_name} {customer.last_name} ({customer.email})
          </p>
        </section>

        <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Profile</h2>
          <form onSubmit={saveProfile} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">First name</span>
              <input
                value={profile.first_name}
                onChange={(e) => setProfile((p) => ({ ...p, first_name: e.target.value }))}
                className="w-full rounded-md border border-zinc-600 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Last name</span>
              <input
                value={profile.last_name}
                onChange={(e) => setProfile((p) => ({ ...p, last_name: e.target.value }))}
                className="w-full rounded-md border border-zinc-600 px-3 py-2"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">Phone</span>
              <input
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                className="w-full rounded-md border border-zinc-600 px-3 py-2"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={profilePending}
                className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-[var(--accent-strong)] disabled:opacity-60"
              >
                {profilePending ? "Saving..." : "Save profile"}
              </button>
              {profileMessage ? <p className="mt-2 text-sm text-zinc-400">{profileMessage}</p> : null}
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Password</h2>
          <form onSubmit={changePassword} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">Current password</span>
              <input
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm((p) => ({ ...p, current_password: e.target.value }))}
                className="w-full rounded-md border border-zinc-600 px-3 py-2"
                required
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">New password</span>
              <input
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm((p) => ({ ...p, new_password: e.target.value }))}
                className="w-full rounded-md border border-zinc-600 px-3 py-2"
                required
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Confirm new password</span>
              <input
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirm_password: e.target.value }))}
                className="w-full rounded-md border border-zinc-600 px-3 py-2"
                required
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={passwordPending}
                className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-[var(--accent-strong)] disabled:opacity-60"
              >
                {passwordPending ? "Updating..." : "Change password"}
              </button>
              {passwordMessage ? <p className="mt-2 text-sm text-zinc-400">{passwordMessage}</p> : null}
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-sm">
          <h2 className="text-xl font-semibold">My Orders</h2>
          {(orders ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">No orders yet.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {orders.map((order) => (
                <article key={order.id} className="rounded-lg border border-zinc-700 p-3 text-sm">
                  <p className="font-medium">Order #{order.display_id ?? order.id}</p>
                  <p className="text-zinc-400">Status: {order.status ?? "N/A"}</p>
                  <p className="text-zinc-400">
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

        <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Address Book</h2>
          <Link href="/account/addresses" className="mt-2 inline-flex text-sm font-medium text-orange-700">
            Manage addresses
          </Link>
        </section>
      </div>
    </main>
  )
}
