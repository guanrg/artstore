import { useEffect, useState } from "react"

export type AdminLanguage = "zhCN" | "en"

const ADMIN_LANGUAGE_KEY = "lng"
const DEFAULT_ADMIN_LANGUAGE: AdminLanguage = "zhCN"

function getCookieLanguage(): string {
  const pair = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${ADMIN_LANGUAGE_KEY}=`))

  return pair ? pair.slice(`${ADMIN_LANGUAGE_KEY}=`.length) : ""
}

export function getAdminLanguage(): AdminLanguage {
  if (typeof window === "undefined") {
    return DEFAULT_ADMIN_LANGUAGE
  }

  const stored = localStorage.getItem(ADMIN_LANGUAGE_KEY) || getCookieLanguage()
  return stored === "en" ? "en" : DEFAULT_ADMIN_LANGUAGE
}

export function applyAdminLanguage(language: AdminLanguage, reload = true) {
  localStorage.setItem(ADMIN_LANGUAGE_KEY, language)
  document.cookie = `${ADMIN_LANGUAGE_KEY}=${language}; path=/; max-age=31536000; samesite=lax`

  if (reload) {
    window.location.reload()
  }
}

export function useAdminLanguage() {
  const [language, setLanguageState] = useState<AdminLanguage>(DEFAULT_ADMIN_LANGUAGE)

  useEffect(() => {
    setLanguageState(getAdminLanguage())
  }, [])

  const setLanguage = (next: AdminLanguage) => {
    if (next === language) {
      return
    }

    setLanguageState(next)
    applyAdminLanguage(next)
  }

  const t = (zh: string, en: string) => (language === "zhCN" ? zh : en)

  return {
    language,
    setLanguage,
    t,
    isChinese: language === "zhCN",
  }
}
