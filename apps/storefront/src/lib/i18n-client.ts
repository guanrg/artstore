import { DEFAULT_LOCALE, dict, normalizeLocale, type Locale } from "@/lib/i18n-dict"

export function getClientLocale(): Locale {
  if (typeof document === "undefined") {
    return DEFAULT_LOCALE
  }

  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/)
  return normalizeLocale(match?.[1])
}

export function getClientDict() {
  const locale = getClientLocale()
  return { locale, t: dict[locale] }
}

