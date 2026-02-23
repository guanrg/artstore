import Link from "next/link"
import { notFound } from "next/navigation"
import { AddToCart } from "@/components/add-to-cart"
import { ProductGallery } from "@/components/product-gallery"
import { getServerDict } from "@/lib/i18n-server"

type MedusaProduct = {
  id: string
  title: string
  subtitle?: string
  description?: string
  handle?: string
  thumbnail?: string
  images?: Array<{
    id: string
    url: string
  }>
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

    const fields = encodeURIComponent("*images,*variants.calculated_price,+variants.calculated_price")
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
      }
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
  const { locale, t } = await getServerDict()
  const { slug } = await params
  const product = await fetchProductBySlug(slug)

  if (!product) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950 p-8 text-zinc-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/" className="inline-flex text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-strong)]">
          {t.product.back}
        </Link>

        <section className="rounded-2xl border border-[var(--border)] bg-zinc-900/70 p-8 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-[var(--accent)]">{t.product.detail}</p>
          <h1 className="mt-2 text-3xl font-bold">{product.title}</h1>
          <p className="mt-2 text-zinc-400">{product.subtitle ?? t.product.noSubtitle}</p>
          <p className="mt-2 text-lg font-semibold text-zinc-100">
            {getFromPrice(product) !== null ? `${t.product.from} $ ${getFromPrice(product)}` : t.product.priceUnavailable}
          </p>

          <ProductGallery
            title={product.title}
            labels={t.gallery}
            imageUrls={Array.from(
              new Set(
                [
                  ...(product.images ?? []).map((img) => img.url).filter(Boolean),
                  product.thumbnail ?? "",
                ].filter(Boolean)
              )
            )}
          />

          <div className="mt-6 space-y-2 rounded-xl bg-zinc-950/70 p-4 text-sm">
            <p>
              <span className="font-medium">{t.product.id}:</span> {product.id}
            </p>
            <p>
              <span className="font-medium">{t.product.handle}:</span> {product.handle ?? "N/A"}
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-[var(--border)] p-4">
            <p className="text-sm font-semibold">{t.product.options}</p>
            {(product.options?.length ?? 0) > 0 ? (
              <div className="mt-3 space-y-2 text-sm">
                {(product.options ?? []).map((opt) => (
                  <div key={opt.id}>
                    <p className="font-medium">{opt.title}</p>
                    <p className="text-zinc-400">
                      {(opt.values ?? []).map((v) => v.value).join(" / ") || t.product.noValues}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">{t.product.noOptions}</p>
            )}
          </div>

          <div className="mt-6 rounded-xl border border-[var(--border)] p-4">
            <p className="text-sm font-semibold">{t.product.variants}</p>
            {(product.variants?.length ?? 0) > 0 ? (
              <div className="mt-3 space-y-2">
                {(product.variants ?? []).map((variant) => (
                  <div key={variant.id} className="rounded-lg bg-zinc-950/70 p-3 text-sm">
                    <p className="font-medium">{variant.title || t.product.variant}</p>
                    <p className="text-zinc-400">{t.product.sku}: {variant.sku || "N/A"}</p>
                    <p className="text-zinc-300">
                      {typeof variant.calculated_price?.calculated_amount === "number"
                        ? `$ ${variant.calculated_price.calculated_amount}`
                        : t.product.noPrice}
                    </p>
                    <p className="text-zinc-400">
                      {(variant.options ?? []).map((o) => o.value).filter(Boolean).join(" / ") || t.product.noOptionValues}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">{t.product.noVariants}</p>
            )}
          </div>

          <article className="mt-6 text-zinc-300">
            {product.description ?? t.product.noDescription}
          </article>

          <AddToCart locale={locale} options={product.options ?? []} variants={product.variants ?? []} />
        </section>
      </div>
    </main>
  )
}
