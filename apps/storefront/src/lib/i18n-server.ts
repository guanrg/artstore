import { cookies } from "next/headers"
import { DEFAULT_LOCALE, dict, normalizeLocale, type Locale } from "@/lib/i18n-dict"

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const value = cookieStore.get("locale")?.value
  return normalizeLocale(value ?? DEFAULT_LOCALE)
}

export async function getServerDict() {
  const locale = await getServerLocale()
  return { locale, t: dict[locale] }
}

