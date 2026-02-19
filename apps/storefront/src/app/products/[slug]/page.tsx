import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { AddToCart } from "@/components/add-to-cart"

type MedusaProduct = {
  id: string
  title: string
  subtitle?: string
  description?: string
  handle?: string
  thumbnail?: string
  options?: Array<{
    id: string
    title: string
    values?: Array<{ id: string; value: string }>
  }>
  variants?: Array<{
    id: string
    title?: string
    sku?: string
    options?: Array<{ id: string; value?: string; option?: { id: string; title: string } }>
    calculated_price?: {
      calculated_amount?: number
      currency_code?: string
    }
  }>
}

async function fetchProductBySlug(slug: string): Promise<MedusaProduct | null> {
  const baseUrl = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
  const publishableKey = process.env.MEDUSA_PUBLISHABLE_KEY
  const headers = publishableKey ? { "x-publishable-api-key": publishableKey } : {}

  try {
    const regionsRes = await fetch(`${baseUrl}/store/regions`, {
      headers,
      next: { revalidate: 30 },
    })
    if (!regionsRes.ok) {
      return null
    }
    const regionsJson = (await regionsRes.json()) as { regions?: Array<{ id: string; currency_code?: string }> }
    const regionId =
      regionsJson.regions?.find((region) => region.currency_code?.toLowerCase() === "aud")?.id ??
      regionsJson.regions?.[0]?.id
    if (!regionId) {
      return null
    }

    const fields = encodeURIComponent("*variants.calculated_price,+variants.calculated_price")
    const byIdRes = await fetch(`${baseUrl}/store/products/${slug}?region_id=${regionId}&fields=${fields}`, {
      headers,
      next: { revalidate: 30 },
    })

    if (byIdRes.ok) {
      const byIdJson = (await byIdRes.json()) as { product?: MedusaProduct }
      if (byIdJson.product) {
        return byIdJson.product
      }
    }

    const byHandleRes = await fetch(
      `${baseUrl}/store/products?handle=${encodeURIComponent(slug)}&limit=1&region_id=${regionId}&fields=${fields}`,
      {
      headers,
      next: { revalidate: 30 },
      },
    )

    if (!byHandleRes.ok) {
      return null
    }

    const byHandleJson = (await byHandleRes.json()) as { products?: MedusaProduct[] }
    return byHandleJson.products?.[0] ?? null
  } catch {
    return null
  }
}

function getFromPrice(product: MedusaProduct) {
  const amounts = (product.variants ?? [])
    .map((variant) => variant.calculated_price?.calculated_amount)
    .filter((value): value is number => typeof value === "number")
  if (amounts.length === 0) return null
  return Math.min(...amounts)
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await fetchProductBySlug(slug)

  if (!product) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-8 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/" className="inline-flex text-sm font-medium text-orange-700 hover:text-orange-900">
          Back to products
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-orange-600">Product Detail</p>
          <h1 className="mt-2 text-3xl font-bold">{product.title}</h1>
          <p className="mt-2 text-slate-600">{product.subtitle ?? "No subtitle"}</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {getFromPrice(product) !== null ? `From $ ${getFromPrice(product)}` : "Price unavailable"}
          </p>

          <div className="mt-6 overflow-hidden rounded-xl bg-slate-100">
            {product.thumbnail ? (
              <Image
                src={product.thumbnail}
                alt={product.title}
                width={960}
                height={540}
                className="h-72 w-full object-cover"
              />
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-slate-500">No image</div>
            )}
          </div>

          <div className="mt-6 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
            <p>
              <span className="font-medium">ID:</span> {product.id}
            </p>
            <p>
              <span className="font-medium">Handle:</span> {product.handle ?? "N/A"}
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold">Options</p>
            {(product.options?.length ?? 0) > 0 ? (
              <div className="mt-3 space-y-2 text-sm">
                {(product.options ?? []).map((opt) => (
                  <div key={opt.id}>
                    <p className="font-medium">{opt.title}</p>
                    <p className="text-slate-600">
                      {(opt.values ?? []).map((v) => v.value).join(" / ") || "No values"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No options</p>
            )}
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold">Variants</p>
            {(product.variants?.length ?? 0) > 0 ? (
              <div className="mt-3 space-y-2">
                {(product.variants ?? []).map((variant) => (
                  <div key={variant.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="font-medium">{variant.title || "Variant"}</p>
                    <p className="text-slate-600">SKU: {variant.sku || "N/A"}</p>
                    <p className="text-slate-700">
                      {typeof variant.calculated_price?.calculated_amount === "number"
                        ? `$ ${variant.calculated_price.calculated_amount}`
                        : "No price"}
                    </p>
                    <p className="text-slate-600">
                      {(variant.options ?? []).map((o) => o.value).filter(Boolean).join(" / ") || "No option values"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No variants</p>
            )}
          </div>

          <article className="mt-6 text-slate-700">
            {product.description ?? "No description yet."}
          </article>

          <AddToCart options={product.options ?? []} variants={product.variants ?? []} />
        </section>
      </div>
    </main>
  )
}
