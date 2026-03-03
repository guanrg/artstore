import type { MetadataRoute } from "next"

type MedusaProduct = {
  id: string
  handle?: string
  updated_at?: string
  created_at?: string
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
}

async function getProductUrls(siteUrl: string): Promise<MetadataRoute.Sitemap> {
  const backend = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
  const publishableKey = process.env.MEDUSA_PUBLISHABLE_KEY
  const headers = publishableKey ? { "x-publishable-api-key": publishableKey } : {}

  try {
    const res = await fetch(`${backend}/store/products?limit=500`, {
      headers,
      next: { revalidate: 3600 },
    })
    if (!res.ok) {
      return []
    }

    const json = (await res.json()) as { products?: MedusaProduct[] }
    return (json.products ?? []).map((product) => {
      const slug = product.handle?.trim() || product.id
      const date = product.updated_at || product.created_at
      return {
        url: `${siteUrl}/products/${encodeURIComponent(slug)}`,
        lastModified: date ? new Date(date) : new Date(),
        changeFrequency: "daily",
        priority: 0.8,
      }
    })
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/cart`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.6,
    },
  ]

  const productPages = await getProductUrls(siteUrl)
  return [...staticPages, ...productPages]
}
