import Link from "next/link"
import Image from "next/image"

type MedusaProduct = {
  id: string
  title: string
  subtitle?: string
  thumbnail?: string
  handle?: string
  variants?: Array<{
    id: string
    calculated_price?: {
      calculated_amount?: number
      currency_code?: string
    }
  }>
  options?: Array<{
    id: string
    title: string
    values?: Array<{ id: string; value: string }>
  }>
}

type StrapiArticle = {
  id: number
  title?: string
  slug?: string
  excerpt?: string
}

async function getMedusaProducts(): Promise<{ data: MedusaProduct[]; error?: string }> {
  const baseUrl = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
  const publishableKey = process.env.MEDUSA_PUBLISHABLE_KEY

  try {
    const regionRes = await fetch(`${baseUrl}/store/regions`, {
      headers: publishableKey ? { "x-publishable-api-key": publishableKey } : {},
      next: { revalidate: 30 },
    })
    if (!regionRes.ok) {
      return { data: [], error: `Medusa regions API ${regionRes.status}` }
    }
    const regionJson = (await regionRes.json()) as {
      regions?: Array<{ id: string; currency_code?: string }>
    }
    const auRegionId =
      regionJson.regions?.find((r) => r.currency_code?.toLowerCase() === "aud")?.id ??
      regionJson.regions?.[0]?.id
    if (!auRegionId) {
      return { data: [], error: "No region configured in Medusa" }
    }

    const query = new URLSearchParams({
      limit: "8",
      region_id: auRegionId,
      fields: "*variants.calculated_price,+variants.calculated_price",
    })
    const res = await fetch(`${baseUrl}/store/products?${query.toString()}`, {
      headers: publishableKey ? { "x-publishable-api-key": publishableKey } : {},
      next: { revalidate: 30 },
    })

    if (!res.ok) {
      return { data: [], error: `Medusa API ${res.status}` }
    }

    const json = (await res.json()) as { products?: MedusaProduct[] }
    return { data: json.products ?? [] }
  } catch {
    return { data: [], error: "Medusa service unavailable" }
  }
}

async function getStrapiArticles(): Promise<{ data: StrapiArticle[]; error?: string }> {
  const baseUrl = process.env.STRAPI_URL ?? "http://localhost:1337"

  try {
    const res = await fetch(`${baseUrl}/api/articles?pagination[limit]=4`, {
      next: { revalidate: 30 },
    })

    if (!res.ok) {
      return { data: [], error: `Strapi API ${res.status}` }
    }

    const json = (await res.json()) as {
      data?: Array<{
        id: number
        title?: string
        slug?: string
        excerpt?: string
        attributes?: StrapiArticle
      }>
    }

    const list =
      json.data?.map((item) => ({
        id: item.id,
        title: item.title ?? item.attributes?.title ?? `Article #${item.id}`,
        slug: item.slug ?? item.attributes?.slug ?? "",
        excerpt: item.excerpt ?? item.attributes?.excerpt ?? "",
      })) ?? []

    return { data: list }
  } catch {
    return { data: [], error: "Strapi service unavailable" }
  }
}

function getFromPrice(product: MedusaProduct) {
  const amounts = (product.variants ?? [])
    .map((v) => v.calculated_price?.calculated_amount)
    .filter((n): n is number => typeof n === "number")
  if (amounts.length === 0) return null
  return Math.min(...amounts)
}

export default async function Home() {
  const [medusa, strapi] = await Promise.all([getMedusaProducts(), getStrapiArticles()])

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-8 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-2xl border border-orange-200 bg-white p-8 shadow-sm">
          <p className="text-sm uppercase tracking-widest text-orange-600">Starter</p>
          <h1 className="mt-2 text-3xl font-bold">Strapi + Medusa Commerce</h1>
          <p className="mt-3 text-slate-600">
            Products come from Medusa and content comes from Strapi.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Products (Medusa)</h2>
            <span className="text-sm text-slate-500">{medusa.data.length} items</span>
          </div>
          {medusa.error ? <p className="text-sm text-rose-600">{medusa.error}</p> : null}
          <div className="grid gap-4 md:grid-cols-4">
            {medusa.data.map((item) => (
              <Link
                key={item.id}
                href={`/products/${item.handle ?? item.id}`}
                className="group rounded-xl border border-slate-200 p-4 transition hover:border-orange-300 hover:shadow-sm"
              >
                <article>
                  <div className="mb-3 h-36 overflow-hidden rounded-lg bg-slate-100">
                    {item.thumbnail ? (
                      <Image
                        src={item.thumbnail}
                        alt={item.title}
                        width={320}
                        height={220}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-500">No image</div>
                    )}
                  </div>
                  <p className="line-clamp-1 font-medium group-hover:text-orange-700">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.subtitle ?? "No subtitle"}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {getFromPrice(item) !== null ? `$ ${getFromPrice(item)}` : "Price unavailable"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {(item.options ?? []).map((opt) => opt.title).join(" / ") || "No options"}
                  </p>
                  <p className="mt-3 text-xs font-medium text-orange-600">View details</p>
                </article>
              </Link>
            ))}
            {medusa.data.length === 0 ? (
              <p className="text-sm text-slate-500">No products yet. Create products in Medusa admin.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Content (Strapi)</h2>
            <span className="text-sm text-slate-500">{strapi.data.length} entries</span>
          </div>
          {strapi.error ? <p className="text-sm text-rose-600">{strapi.error}</p> : null}
          <div className="space-y-3">
            {strapi.data.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 p-4">
                <p className="font-medium">{item.title ?? `Article #${item.id}`}</p>
                <p className="mt-1 text-sm text-slate-600">{item.excerpt || "No excerpt"}</p>
              </article>
            ))}
            {strapi.data.length === 0 ? (
              <p className="text-sm text-slate-500">
                No content yet. Create an `Article` collection type in Strapi and allow Public `find` / `findOne`.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}
