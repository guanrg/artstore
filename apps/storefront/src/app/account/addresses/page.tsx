"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

type Address = {
  id: string
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

type AddressForm = {
  first_name: string
  last_name: string
  address_1: string
  address_2: string
  city: string
  province: string
  postal_code: string
  country_code: string
  phone: string
}

const emptyForm: AddressForm = {
  first_name: "",
  last_name: "",
  address_1: "",
  address_2: "",
  city: "",
  province: "",
  postal_code: "",
  country_code: "us",
  phone: "",
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [form, setForm] = useState<AddressForm>(emptyForm)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const load = async () => {
    const res = await fetch("/api/account/addresses")
    const json = (await res.json()) as { addresses?: Address[]; message?: string }
    if (!res.ok) {
      setError(json.message ?? "Failed to load addresses")
      return
    }
    setAddresses(json.addresses ?? [])
  }

  useEffect(() => {
    let active = true
    const boot = async () => {
      const res = await fetch("/api/account/addresses")
      const json = (await res.json()) as { addresses?: Address[]; message?: string }
      if (!active) return
      if (!res.ok) {
        setError(json.message ?? "Failed to load addresses")
        return
      }
      setAddresses(json.addresses ?? [])
    }
    boot().catch(() => {
      if (!active) return
      setError("Failed to load addresses")
    })
    return () => {
      active = false
    }
  }, [])

  const createAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setMessage("")
    const res = await fetch("/api/account/addresses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    })
    const json = (await res.json()) as { message?: string }
    if (!res.ok) {
      setError(json.message ?? "Failed to add address")
      return
    }
    setForm(emptyForm)
    setMessage("Address added.")
    await load()
  }

  const removeAddress = async (id: string) => {
    const res = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" })
    const json = (await res.json()) as { message?: string }
    if (!res.ok) {
      setError(json.message ?? "Failed to remove address")
      return
    }
    await load()
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Link href="/account" className="text-sm font-medium text-orange-700">
            Back to account
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Address Book</h1>
          {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
          {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}

          <div className="mt-4 space-y-2">
            {addresses.map((addr) => (
              <article key={addr.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium">
                  {addr.first_name} {addr.last_name}
                </p>
                <p className="text-slate-600">
                  {[addr.address_1, addr.address_2, addr.city, addr.province, addr.postal_code]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p className="text-slate-600">{addr.country_code?.toUpperCase()}</p>
                <button
                  type="button"
                  onClick={() => removeAddress(addr.id)}
                  className="mt-1 text-xs font-medium text-rose-600 hover:text-rose-700"
                >
                  Delete
                </button>
              </article>
            ))}
            {addresses.length === 0 ? <p className="text-sm text-slate-500">No addresses yet.</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Add address</h2>
          <form onSubmit={createAddress} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="First name" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Last name" value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
            <input className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Address 1" value={form.address_1} onChange={(e) => setForm((p) => ({ ...p, address_1: e.target.value }))} />
            <input className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Address 2" value={form.address_2} onChange={(e) => setForm((p) => ({ ...p, address_2: e.target.value }))} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="City" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Province/State" value={form.province} onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Postal code" value={form.postal_code} onChange={(e) => setForm((p) => ({ ...p, postal_code: e.target.value }))} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Country code (us)" value={form.country_code} onChange={(e) => setForm((p) => ({ ...p, country_code: e.target.value.toLowerCase() }))} />
            <input className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            <button type="submit" className="sm:col-span-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700">
              Add address
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
