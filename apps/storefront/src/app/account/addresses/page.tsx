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
  country_code: "au",
  phone: "",
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [form, setForm] = useState<AddressForm>(emptyForm)
  const [editingId, setEditingId] = useState("")
  const [editForm, setEditForm] = useState<AddressForm>(emptyForm)
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

  const startEdit = (addr: Address) => {
    setEditingId(addr.id)
    setEditForm({
      first_name: addr.first_name ?? "",
      last_name: addr.last_name ?? "",
      address_1: addr.address_1 ?? "",
      address_2: addr.address_2 ?? "",
      city: addr.city ?? "",
      province: addr.province ?? "",
      postal_code: addr.postal_code ?? "",
      country_code: "au",
      phone: addr.phone ?? "",
    })
    setError("")
    setMessage("")
  }

  const cancelEdit = () => {
    setEditingId("")
    setEditForm(emptyForm)
  }

  const updateAddress = async (id: string) => {
    setError("")
    setMessage("")
    const res = await fetch(`/api/account/addresses/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editForm),
    })
    const json = (await res.json()) as { message?: string }
    if (!res.ok) {
      setError(json.message ?? "Failed to update address")
      return
    }
    setMessage("Address updated.")
    cancelEdit()
    await load()
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-sm">
          <Link href="/account" className="text-sm font-medium text-orange-700">
            Back to account
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Address Book</h1>
          {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
          {message ? <p className="mt-2 text-sm text-emerald-300">{message}</p> : null}

          <div className="mt-4 space-y-2">
            {addresses.map((addr) => (
              <article key={addr.id} className="rounded-lg border border-zinc-700 p-3 text-sm">
                {editingId === addr.id ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input className="rounded-md border border-zinc-600 px-3 py-2 text-sm" placeholder="First name" value={editForm.first_name} onChange={(e) => setEditForm((p) => ({ ...p, first_name: e.target.value }))} />
                    <input className="rounded-md border border-zinc-600 px-3 py-2 text-sm" placeholder="Last name" value={editForm.last_name} onChange={(e) => setEditForm((p) => ({ ...p, last_name: e.target.value }))} />
                    <input className="sm:col-span-2 rounded-md border border-zinc-600 px-3 py-2 text-sm" placeholder="Address 1" value={editForm.address_1} onChange={(e) => setEditForm((p) => ({ ...p, address_1: e.target.value }))} />
                    <input className="sm:col-span-2 rounded-md border border-zinc-600 px-3 py-2 text-sm" placeholder="Address 2" value={editForm.address_2} onChange={(e) => setEditForm((p) => ({ ...p, address_2: e.target.value }))} />
                    <input className="rounded-md border border-zinc-600 px-3 py-2 text-sm" placeholder="City" value={editForm.city} onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))} />
                    <input className="rounded-md border border-zinc-600 px-3 py-2 text-sm" placeholder="Province/State" value={editForm.province} onChange={(e) => setEditForm((p) => ({ ...p, province: e.target.value }))} />
                    <input className="rounded-md border border-zinc-600 px-3 py-2 text-sm" placeholder="Postal code" value={editForm.postal_code} onChange={(e) => setEditForm((p) => ({ ...p, postal_code: e.target.value }))} />
                    <p className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300">Country: Australia (AU)</p>
                    <input className="sm:col-span-2 rounded-md border border-zinc-600 px-3 py-2 text-sm" placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
                    <div className="sm:col-span-2 flex gap-2">
                      <button type="button" onClick={() => void updateAddress(addr.id)} className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700">
                        Save
                      </button>
                      <button type="button" onClick={cancelEdit} className="rounded-md border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-medium">
                      {addr.first_name} {addr.last_name}
                    </p>
                    <p className="text-zinc-400">
                      {[addr.address_1, addr.address_2, addr.city, addr.province, addr.postal_code]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <p className="text-zinc-400">{addr.country_code?.toUpperCase()}</p>
                    <div className="mt-1 flex gap-3">
                      <button
                        type="button"
                        onClick={() => startEdit(addr)}
                        className="text-xs font-medium text-orange-600 hover:text-orange-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAddress(addr.id)}
                        className="text-xs font-medium text-rose-600 hover:text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
            {addresses.length === 0 ? <p className="text-sm text-zinc-400">No addresses yet.</p> : null}
          </div>
        </section>

        <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Add address</h2>
          <form onSubmit={createAddress} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input className="rounded-md border border-zinc-600 px-3 py-2 text-sm" placeholder="First name" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
            <input className="rounded-md border border-zinc-600 px-3 py-2 text-sm" placeholder="Last name" value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
            <input className="sm:col-span-2 rounded-md border border-zinc-600 px-3 py-2 text-sm" placeholder="Address 1" value={form.address_1} onChange={(e) => setForm((p) => ({ ...p, address_1: e.target.value }))} />
            <input className="sm:col-span-2 rounded-md border border-zinc-600 px-3 py-2 text-sm" placeholder="Address 2" value={form.address_2} onChange={(e) => setForm((p) => ({ ...p, address_2: e.target.value }))} />
            <input className="rounded-md border border-zinc-600 px-3 py-2 text-sm" placeholder="City" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
            <input className="rounded-md border border-zinc-600 px-3 py-2 text-sm" placeholder="Province/State" value={form.province} onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))} />
            <input className="rounded-md border border-zinc-600 px-3 py-2 text-sm" placeholder="Postal code" value={form.postal_code} onChange={(e) => setForm((p) => ({ ...p, postal_code: e.target.value }))} />
            <p className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300">Country: Australia (AU)</p>
            <input className="sm:col-span-2 rounded-md border border-zinc-600 px-3 py-2 text-sm" placeholder="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            <button type="submit" className="sm:col-span-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700">
              Add address
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
