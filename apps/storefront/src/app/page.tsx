import Link from "next/link"
import Image from "next/image"
import { getServerDict } from "@/lib/i18n-server"

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
      limit: "12",
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
    const res = await fetch(`${baseUrl}/api/articles?pagination[limit]=3`, {
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

function formatAud(amount: number | null, priceOnRequest: string) {
  if (amount === null) return priceOnRequest
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(amount)
}

export default async function Home() {
  const { locale, t } = await getServerDict()
  const [medusa, strapi] = await Promise.all([getMedusaProducts(), getStrapiArticles()])

  const editorial =
    strapi.data.length > 0
      ? strapi.data
      : [
          {
            id: 9001,
            title: locale === "zh" ? "解读青铜表面与包浆" : "Reading Bronze Surface and Patina",
            excerpt:
              locale === "zh"
                ? "氧化层、铸造痕迹与修复记录，都会直接影响收藏价值。"
                : "How oxidation, casting marks, and restoration traces affect value.",
          },
          {
            id: 9002,
            title: locale === "zh" ? "古典油画收藏实操指南" : "Collecting Oil Paintings with Confidence",
            excerpt:
              locale === "zh"
                ? "从画布状态、颜料稳定性到来源文献，快速完成基础判断。"
                : "A practical checklist for canvas condition, pigment stability, and provenance.",
          },
          {
            id: 9003,
            title: locale === "zh" ? "艺术品与现代空间陈列" : "Staging Art in Contemporary Interiors",
            excerpt:
              locale === "zh"
                ? "利用光线与留白，让单件作品成为空间视觉焦点。"
                : "Use lighting and negative space to let a single piece command attention.",
          },
        ]

  return (
    <main className="art-shell min-h-screen p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-10">
        <section className="glass-card reveal-up relative overflow-hidden rounded-3xl p-7 md:p-10">
          <div className="pointer-events-none absolute -right-28 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,#b7864860_0%,transparent_66%)]" />
          <div className="pointer-events-none absolute -left-28 bottom-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,#cdb08a55_0%,transparent_70%)]" />
          <div className="relative grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.33em] text-zinc-500">{t.home.heroTag}</p>
              <h1 className="mt-3 text-5xl leading-[0.98] text-zinc-100 md:text-6xl">
                {t.home.heroTitle1}
                <br />
                {t.home.heroTitle2}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-300 md:text-base">{t.home.heroDesc}</p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-[var(--border)] bg-zinc-900/70 px-3 py-1 text-zinc-200">{t.home.chip1}</span>
                <span className="rounded-full border border-[var(--border)] bg-zinc-900/70 px-3 py-1 text-zinc-200">{t.home.chip2}</span>
                <span className="rounded-full border border-[var(--border)] bg-zinc-900/70 px-3 py-1 text-zinc-200">{t.home.chip3}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-zinc-900/70 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t.home.statusTitle}</p>
              <p className="mt-3 text-3xl text-zinc-100">{medusa.data.length}</p>
              <p className="mt-1 text-sm text-zinc-400">{t.home.statusDesc}</p>
              <Link href="/account/register" className="accent-link mt-4 inline-block text-sm font-semibold">
                {t.home.createAccount}
              </Link>
            </div>
          </div>
        </section>

        <section className="reveal-up rounded-3xl border border-[var(--border)] bg-zinc-950/65 p-6 md:p-7">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">{t.home.catalogue}</p>
              <h2 className="text-3xl text-zinc-100">{t.home.featured}</h2>
            </div>
            <p className="text-sm text-zinc-500">{medusa.data.length} {t.home.listed}</p>
          </div>

          {medusa.error ? <p className="mb-4 text-sm text-rose-700">{medusa.error}</p> : null}

          <div className="grid gap-4 md:grid-cols-3">
            {medusa.data.map((item, index) => (
              <Link
                key={item.id}
                href={`/products/${item.handle ?? item.id}`}
                className={`group overflow-hidden rounded-2xl border border-[var(--border)] bg-zinc-900/70 transition hover:-translate-y-0.5 hover:shadow-xl ${
                  index % 5 === 0 ? "md:col-span-2" : ""
                }`}
              >
                <article>
                  <div className={`${index % 5 === 0 ? "h-72" : "h-56"} overflow-hidden bg-zinc-800`}>
                    {item.thumbnail ? (
                      <Image
                        src={item.thumbnail}
                        alt={item.title}
                        width={900}
                        height={700}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-500">{t.home.noImage}</div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-1 text-lg text-zinc-100">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{item.subtitle || t.home.curatedPiece}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-zinc-100">{formatAud(getFromPrice(item), t.home.priceOnRequest)}</p>
                      <p className="accent-link text-xs font-semibold uppercase tracking-[0.18em]">{t.home.viewWork}</p>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      {(item.options ?? []).map((opt) => opt.title).join(" / ") || t.home.standardDetails}
                    </p>
                  </div>
                </article>
              </Link>
            ))}
          </div>

          {medusa.data.length === 0 ? <p className="mt-4 text-sm text-zinc-500">{t.home.noProducts}</p> : null}
        </section>

        <section className="reveal-up grid gap-5 rounded-3xl border border-[var(--border)] bg-zinc-950/65 p-6 md:grid-cols-3">
          {strapi.error ? <p className="md:col-span-3 text-sm text-rose-700">{strapi.error}</p> : null}
          {editorial.map((item) => (
            <article key={item.id} className="rounded-2xl border border-[var(--border)] bg-zinc-900/70 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t.home.editorial}</p>
              <h3 className="mt-2 text-2xl leading-tight text-zinc-100">{item.title || t.home.untitled}</h3>
              <p className="mt-2 text-sm text-zinc-400">{item.excerpt || t.home.noExcerpt}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
