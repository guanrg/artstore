import Link from "next/link"

type Category = {
  id: string
  name?: string
  handle?: string
  description?: string
}

async function getCategories() {
  const baseUrl = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
  const publishableKey = process.env.MEDUSA_PUBLISHABLE_KEY
  const headers = publishableKey ? { "x-publishable-api-key": publishableKey } : {}

  try {
    const res = await fetch(`${baseUrl}/store/product-categories?limit=200`, {
      headers,
      next: { revalidate: 300 },
    })
    if (!res.ok) {
      return { data: [] as Category[], error: `Category API ${res.status}` }
    }
    const json = (await res.json()) as { product_categories?: Category[] }
    return { data: json.product_categories ?? [] }
  } catch {
    return { data: [] as Category[], error: "Category service unavailable" }
  }
}

export default async function CategoriesPage() {
  const { data, error } = await getCategories()

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950 p-8 text-zinc-100">
      <div className="mx-auto max-w-5xl rounded-2xl border border-[var(--border)] bg-zinc-900/70 p-6 shadow-sm">
        <h1 className="text-3xl font-bold">Categories</h1>
        <p className="mt-2 text-sm text-zinc-400">Browse products by category.</p>
        {error ? <p className="mt-3 text-sm text-rose-500">{error}</p> : null}

        {data.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">No categories found.</p>
        ) : (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {data.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.id}`}
                className="rounded-xl border border-[var(--border)] bg-zinc-950/70 p-4 transition hover:border-zinc-500"
              >
                <p className="font-semibold">{category.name || category.handle || category.id}</p>
                <p className="mt-1 text-sm text-zinc-400">{category.description || "View products in this category."}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
