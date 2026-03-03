import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"

type Category = {
  id: string
  name?: string
  description?: string
}

type Product = {
  id: string
  title: string
  handle?: string
  thumbnail?: string
  subtitle?: string
  variants?: Array<{
    id: string
    calculated_price?: {
      calculated_amount?: number
      currency_code?: string
    }
  }>
}

function getFromPrice(product: Product) {
  const amounts = (product.variants ?? [])
    .map((variant) => variant.calculated_price?.calculated_amount)
    .filter((n): n is number => typeof n === "number")
  if (amounts.length === 0) return null
  return Math.min(...amounts)
}

function formatAud(amount: number | null) {
  if (amount === null) return "Price on request"
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(amount)
}

async function getCategoryPageData(id: string) {
  const baseUrl = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
  const publishableKey = process.env.MEDUSA_PUBLISHABLE_KEY
  const headers = publishableKey ? { "x-publishable-api-key": publishableKey } : {}

  try {
    const [categoryRes, regionsRes] = await Promise.all([
      fetch(`${baseUrl}/store/product-categories/${id}`, { headers, next: { revalidate: 300 } }),
      fetch(`${baseUrl}/store/regions`, { headers, next: { revalidate: 60 } }),
    ])

    if (!categoryRes.ok) {
      return { category: null as Category | null, products: [] as Product[] }
    }

    const categoryJson = (await categoryRes.json()) as { product_category?: Category }
    const category = categoryJson.product_category ?? null

    let regionId: string | undefined
    if (regionsRes.ok) {
      const regionsJson = (await regionsRes.json()) as { regions?: Array<{ id: string; currency_code?: string }> }
      regionId =
        regionsJson.regions?.find((region) => region.currency_code?.toLowerCase() === "aud")?.id ??
        regionsJson.regions?.[0]?.id
    }

    const withRegion = new URLSearchParams({
      category_id: id,
      limit: "200",
      fields: "*variants.calculated_price,+variants.calculated_price",
    })
    if (regionId) {
      withRegion.set("region_id", regionId)
    }

    const fallback = new URLSearchParams({
      category_id: id,
      limit: "200",
      fields: "*variants.calculated_price,+variants.calculated_price",
    })

    for (const query of [withRegion, fallback]) {
      const productsRes = await fetch(`${baseUrl}/store/products?${query.toString()}`, {
        headers,
        next: { revalidate: 60 },
      })
      if (!productsRes.ok) continue
      const productsJson = (await productsRes.json()) as { products?: Product[] }
      const products = productsJson.products ?? []
      if (products.length > 0 || query === fallback) {
        return { category, products }
      }
    }

    return { category, products: [] as Product[] }
  } catch {
    return { category: null as Category | null, products: [] as Product[] }
  }
}

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { category, products } = await getCategoryPageData(id)

  if (!category) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950 p-8 text-zinc-100">
      <div className="mx-auto max-w-6xl space-y-5">
        <Link href="/categories" className="inline-flex text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-strong)]">
          Back to categories
        </Link>

        <section className="rounded-2xl border border-[var(--border)] bg-zinc-900/70 p-6 shadow-sm">
          <h1 className="text-3xl font-bold">{category.name || category.id}</h1>
          <p className="mt-2 text-sm text-zinc-400">{category.description || "Products under this category."}</p>

          {products.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">No products in this category yet.</p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {products.map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.handle?.trim() || item.id}`}
                  className="group overflow-hidden rounded-xl border border-[var(--border)] bg-zinc-950/70 transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="h-56 overflow-hidden bg-zinc-900">
                    {item.thumbnail ? (
                      <Image
                        src={item.thumbnail}
                        alt={item.title}
                        width={700}
                        height={500}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-500">No image</div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-1 text-lg font-medium">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{item.subtitle || "Curated selection"}</p>
                    <p className="mt-3 text-sm font-semibold text-zinc-200">{formatAud(getFromPrice(item))}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
