export const CUSTOMER_TOKEN_COOKIE = "medusa_customer_token"
export const CART_ID_COOKIE = "medusa_cart_id"

const MEDUSA_BASE_URL = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.MEDUSA_PUBLISHABLE_KEY ?? ""

type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

type MedusaRequestOptions = {
  method?: "GET" | "POST" | "DELETE" | "PATCH"
  body?: Record<string, JsonValue> | undefined
  token?: string
}

export async function medusaRequest<T>(
  path: string,
  { method = "GET", body, token }: MedusaRequestOptions = {},
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const headers: Record<string, string> = {
    "x-publishable-api-key": PUBLISHABLE_KEY,
  }

  if (body) {
    headers["content-type"] = "application/json"
  }

  if (token) {
    headers.authorization = `Bearer ${token}`
  }

  try {
    const res = await fetch(`${MEDUSA_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    })

    const text = await res.text()
    const json = text ? (JSON.parse(text) as Record<string, unknown>) : {}

    if (!res.ok) {
      const message =
        typeof json.message === "string" ? json.message : `Medusa request failed (${res.status})`
      return { ok: false, status: res.status, message }
    }

    return { ok: true, data: json as T }
  } catch {
    return { ok: false, status: 500, message: "Unable to reach Medusa backend" }
  }
}

export async function createCart() {
  const regions = await medusaRequest<{
    regions: Array<{ id: string; countries?: Array<{ iso_2: string }> }>
  }>("/store/regions")
  if (!regions.ok || regions.data.regions.length === 0) {
    return { ok: false as const, message: "No region found. Seed Medusa first." }
  }

  const preferredRegion =
    regions.data.regions.find((region) =>
      (region.countries ?? []).some((country) => country.iso_2?.toLowerCase() === "au"),
    ) ?? regions.data.regions[0]

  const cart = await medusaRequest<{ cart: { id: string } }>("/store/carts", {
    method: "POST",
    body: { region_id: preferredRegion.id },
  })

  if (!cart.ok) {
    return { ok: false as const, message: cart.message }
  }

  return { ok: true as const, cartId: cart.data.cart.id }
}
