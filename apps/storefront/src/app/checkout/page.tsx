"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

type CheckoutData = {
  cart?: {
    id: string
    currency_code?: string
    subtotal?: number
    total?: number
    items?: Array<{ id: string; title: string; quantity: number; variant_title?: string }>
  }
  shipping_options?: Array<{ id: string; name?: string; amount?: number }>
  payment_providers?: Array<{ id: string }>
  country_code?: string
}

type SavedAddress = {
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

function fmt(amount: number, currencyCode?: string) {
  if ((currencyCode ?? "").toLowerCase() === "aud") {
    return `$ ${amount}`
  }
  return `${amount} ${currencyCode ?? ""}`.trim()
}

export default function CheckoutPage() {
  const router = useRouter()
  const [data, setData] = useState<CheckoutData>({})
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [shippingOptionId, setShippingOptionId] = useState("")
  const [paymentProviderId, setPaymentProviderId] = useState("")
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [shipping, setShipping] = useState({
    first_name: "",
    last_name: "",
    address_1: "",
    address_2: "",
    city: "",
    province: "",
    postal_code: "",
    country_code: "au",
    phone: "",
  })
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState("")

  useEffect(() => {
    const load = async () => {
      const [checkoutRes, addressRes] = await Promise.all([
        fetch("/api/checkout/options"),
        fetch("/api/account/addresses"),
      ])
      const checkoutJson = (await checkoutRes.json()) as CheckoutData & { message?: string }

      if (!checkoutRes.ok) {
        setError(checkoutJson.message ?? "Failed to load checkout options")
        setLoading(false)
        return
      }
      setData(checkoutJson)
      setShippingOptionId(checkoutJson.shipping_options?.[0]?.id ?? "")
      setPaymentProviderId(checkoutJson.payment_providers?.[0]?.id ?? "")
      setShipping((prev) => ({ ...prev, country_code: (checkoutJson.country_code ?? "au").toLowerCase() }))

      if (addressRes.ok) {
        const addressJson = (await addressRes.json()) as { addresses?: SavedAddress[] }
        const list = addressJson.addresses ?? []
        setSavedAddresses(list)
        if (list.length > 0) {
          const first = list[0]
          setSelectedAddressId(first.id)
          setShipping((prev) => ({
            ...prev,
            first_name: first.first_name ?? "",
            last_name: first.last_name ?? "",
            address_1: first.address_1 ?? "",
            address_2: first.address_2 ?? "",
            city: first.city ?? "",
            province: first.province ?? "",
            postal_code: first.postal_code ?? "",
            country_code: (first.country_code ?? prev.country_code ?? "au").toLowerCase(),
            phone: first.phone ?? "",
          }))
        }
      }

      setLoading(false)
    }

    load().catch(() => {
      setError("Failed to load checkout options")
      setLoading(false)
    })
  }, [])

  const canPlace = useMemo(() => {
    return (
      !!email &&
      !!shipping.first_name &&
      !!shipping.last_name &&
      !!shipping.address_1 &&
      !!shipping.city &&
      !!shipping.postal_code &&
      !!shipping.country_code &&
      !!shippingOptionId &&
      !!paymentProviderId &&
      (data.cart?.items?.length ?? 0) > 0
    )
  }, [data.cart?.items?.length, email, paymentProviderId, shipping, shippingOptionId])

  const fieldInvalid = (name: string, value: string) => {
    const active = attemptedSubmit || touched[name]
    return active && !value.trim()
  }

  const requiredMark = <span className="ml-1 text-rose-600">*</span>

  const placeOrder = async () => {
    setAttemptedSubmit(true)
    if (!canPlace) {
      setError("Please fill all required fields.")
      return
    }

    setPlacing(true)
    setError("")

    const res = await fetch("/api/checkout/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        shipping_option_id: shippingOptionId,
        payment_provider_id: paymentProviderId,
        shipping_address: shipping,
        billing_same_as_shipping: true,
      }),
    })
    const json = (await res.json()) as { message?: string; order?: { id?: string; display_id?: number } }

    if (!res.ok) {
      setError(json.message ?? "Place order failed")
      setPlacing(false)
      return
    }

    const orderId = json.order?.id ?? ""
    const displayId = json.order?.display_id?.toString() ?? ""
    router.push(`/checkout/success?order_id=${encodeURIComponent(orderId)}&display_id=${encodeURIComponent(displayId)}`)
  }

  if (loading) return <main className="p-8">Loading checkout...</main>

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Checkout</h1>
          <p className="mt-2 text-sm text-slate-600">Fill shipping and payment info to place your order.</p>

          {savedAddresses.length > 0 ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <label className="text-sm">
                <span className="mb-1 block font-medium text-emerald-900">Use saved address</span>
                <select
                  value={selectedAddressId}
                  onChange={(e) => {
                    const id = e.target.value
                    setSelectedAddressId(id)
                    const selected = savedAddresses.find((addr) => addr.id === id)
                    if (!selected) return
                    setShipping((prev) => ({
                      ...prev,
                      first_name: selected.first_name ?? "",
                      last_name: selected.last_name ?? "",
                      address_1: selected.address_1 ?? "",
                      address_2: selected.address_2 ?? "",
                      city: selected.city ?? "",
                      province: selected.province ?? "",
                      postal_code: selected.postal_code ?? "",
                      country_code: (selected.country_code ?? prev.country_code ?? "au").toLowerCase(),
                      phone: selected.phone ?? "",
                    }))
                  }}
                  className="w-full rounded-md border border-emerald-300 bg-white px-3 py-2"
                >
                  {savedAddresses.map((addr) => (
                    <option key={addr.id} value={addr.id}>
                      {(addr.first_name ?? "").trim()} {(addr.last_name ?? "").trim()} - {addr.address_1 ?? ""}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-2 text-xs text-emerald-800">
                You can manage addresses in <Link href="/account/addresses" className="underline">Address Book</Link>.
              </p>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Email {requiredMark}</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                type="email"
                className={`w-full rounded-md px-3 py-2 ${
                  fieldInvalid("email", email) ? "border border-rose-500 bg-rose-50" : "border border-slate-300"
                }`}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Phone</span>
              <input
                value={shipping.phone}
                onChange={(e) => setShipping((p) => ({ ...p, phone: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">First name {requiredMark}</span>
              <input
                value={shipping.first_name}
                onChange={(e) => setShipping((p) => ({ ...p, first_name: e.target.value }))}
                onBlur={() => setTouched((p) => ({ ...p, first_name: true }))}
                className={`w-full rounded-md px-3 py-2 ${
                  fieldInvalid("first_name", shipping.first_name)
                    ? "border border-rose-500 bg-rose-50"
                    : "border border-slate-300"
                }`}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Last name {requiredMark}</span>
              <input
                value={shipping.last_name}
                onChange={(e) => setShipping((p) => ({ ...p, last_name: e.target.value }))}
                onBlur={() => setTouched((p) => ({ ...p, last_name: true }))}
                className={`w-full rounded-md px-3 py-2 ${
                  fieldInvalid("last_name", shipping.last_name)
                    ? "border border-rose-500 bg-rose-50"
                    : "border border-slate-300"
                }`}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">Address line 1 {requiredMark}</span>
              <input
                value={shipping.address_1}
                onChange={(e) => setShipping((p) => ({ ...p, address_1: e.target.value }))}
                onBlur={() => setTouched((p) => ({ ...p, address_1: true }))}
                className={`w-full rounded-md px-3 py-2 ${
                  fieldInvalid("address_1", shipping.address_1)
                    ? "border border-rose-500 bg-rose-50"
                    : "border border-slate-300"
                }`}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">Address line 2</span>
              <input
                value={shipping.address_2}
                onChange={(e) => setShipping((p) => ({ ...p, address_2: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">City {requiredMark}</span>
              <input
                value={shipping.city}
                onChange={(e) => setShipping((p) => ({ ...p, city: e.target.value }))}
                onBlur={() => setTouched((p) => ({ ...p, city: true }))}
                className={`w-full rounded-md px-3 py-2 ${
                  fieldInvalid("city", shipping.city) ? "border border-rose-500 bg-rose-50" : "border border-slate-300"
                }`}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">State / Province</span>
              <input
                value={shipping.province}
                onChange={(e) => setShipping((p) => ({ ...p, province: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Postal code {requiredMark}</span>
              <input
                value={shipping.postal_code}
                onChange={(e) => setShipping((p) => ({ ...p, postal_code: e.target.value }))}
                onBlur={() => setTouched((p) => ({ ...p, postal_code: true }))}
                className={`w-full rounded-md px-3 py-2 ${
                  fieldInvalid("postal_code", shipping.postal_code)
                    ? "border border-rose-500 bg-rose-50"
                    : "border border-slate-300"
                }`}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Country code (ISO2) {requiredMark}</span>
              <select
                value={shipping.country_code}
                onChange={(e) => setShipping((p) => ({ ...p, country_code: e.target.value.toLowerCase() }))}
                onBlur={() => setTouched((p) => ({ ...p, country_code: true }))}
                className={`w-full rounded-md px-3 py-2 ${
                  fieldInvalid("country_code", shipping.country_code)
                    ? "border border-rose-500 bg-rose-50"
                    : "border border-slate-300"
                }`}
              >
                <option value="au">Australia (AU)</option>
              </select>
            </label>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Shipping method {requiredMark}</span>
              <select
                value={shippingOptionId}
                onChange={(e) => setShippingOptionId(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, shipping_option_id: true }))}
                className={`w-full rounded-md px-3 py-2 ${
                  fieldInvalid("shipping_option_id", shippingOptionId)
                    ? "border border-rose-500 bg-rose-50"
                    : "border border-slate-300"
                }`}
              >
                {(data.shipping_options ?? []).map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name ?? opt.id} ({opt.amount ?? 0})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Payment provider {requiredMark}</span>
              <select
                value={paymentProviderId}
                onChange={(e) => setPaymentProviderId(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, payment_provider_id: true }))}
                className={`w-full rounded-md px-3 py-2 ${
                  fieldInvalid("payment_provider_id", paymentProviderId)
                    ? "border border-rose-500 bg-rose-50"
                    : "border border-slate-300"
                }`}
              >
                {(data.payment_providers ?? []).map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.id}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              disabled={!canPlace || placing}
              onClick={placeOrder}
              className="rounded-md bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {placing ? "Placing order..." : "Place order"}
            </button>
            <Link href="/cart" className="text-sm font-medium text-slate-700">
              Back to cart
            </Link>
          </div>
          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            {(data.cart?.items ?? []).map((item) => (
              <div key={item.id} className="rounded-md bg-slate-50 p-2">
                <p className="font-medium">{item.title}</p>
                <p className="text-slate-600">
                  {item.variant_title ?? "Variant"} x {item.quantity}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 text-sm">
            <p>
              Subtotal: {fmt(data.cart?.subtotal ?? 0, data.cart?.currency_code)}
            </p>
            <p>
              Total: {fmt(data.cart?.total ?? 0, data.cart?.currency_code)}
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}
