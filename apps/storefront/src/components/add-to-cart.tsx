"use client"

import { useMemo, useState } from "react"
import { emitCartUpdated } from "@/lib/cart-events"
import { dict, type Locale } from "@/lib/i18n-dict"

type OptionValue = {
  id: string
  value: string
  option?: { id: string; title: string }
}

type ProductOption = {
  id: string
  title: string
  values?: Array<{ id: string; value: string }>
}

type Variant = {
  id: string
  title?: string
  sku?: string
  options?: OptionValue[]
  calculated_price?: {
    calculated_amount?: number
    currency_code?: string
  }
}

function matchVariant(variants: Variant[], selected: Record<string, string>) {
  return variants.find((variant) =>
    (variant.options ?? []).every((opt) => {
      const optionId = opt.option?.id ?? ""
      if (!optionId) return true
      return selected[optionId] === opt.value
    }),
  )
}

export function AddToCart({
  options,
  variants,
  locale = "en",
}: {
  options: ProductOption[]
  variants: Variant[]
  locale?: Locale
}) {
  const t = dict[locale].addToCart
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      options.map((opt) => [opt.id, opt.values?.[0]?.value ?? ""]),
    ),
  )
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)

  const variant = useMemo(() => matchVariant(variants, selected), [variants, selected])
  const currentPrice = variant?.calculated_price?.calculated_amount

  const onSubmit = async () => {
    if (!variant?.id) {
      setMessage(t.selectVariant)
      return
    }

    setPending(true)
    setMessage("")
    const res = await fetch("/api/cart/line-items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ variant_id: variant.id, quantity }),
    })
    const json = (await res.json()) as { message?: string }

    if (!res.ok) {
      setMessage(json.message ?? t.addFailed)
    } else {
      emitCartUpdated()
      setMessage(t.added)
    }
    setPending(false)
  }

  return (
    <div className="mt-6 rounded-xl border border-slate-200 p-4">
      <p className="text-sm font-semibold">{t.title}</p>
      <div className="mt-3 space-y-3">
        {options.map((opt) => (
          <label key={opt.id} className="block text-sm">
            <span className="mb-1 block font-medium">{opt.title}</span>
            <select
              value={selected[opt.id] ?? ""}
              onChange={(e) => setSelected((prev) => ({ ...prev, [opt.id]: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              {(opt.values ?? []).map((value) => (
                <option key={value.id} value={value.value}>
                  {value.value}
                </option>
              ))}
            </select>
          </label>
        ))}

        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t.quantity}</span>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value || 1)))}
            className="w-28 rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <p className="text-sm font-semibold text-slate-900">
          {typeof currentPrice === "number" ? `${t.selectedPrice}: $ ${currentPrice}` : t.selectedPriceUnavailable}
        </p>

        <button
          type="button"
          onClick={onSubmit}
          disabled={pending || !variant?.id}
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? t.adding : t.add}
        </button>
        <a href="/cart" className="ml-3 text-sm font-medium text-orange-700 hover:text-orange-900">
          {t.goToCart}
        </a>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </div>
    </div>
  )
}
