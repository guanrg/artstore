import { useEffect, useMemo, useState } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { getAdminLanguage, useAdminLanguage } from "../lib/admin-language"
import { adminTheme } from "../lib/admin-theme"
import { syncAdminRouteBody } from "../lib/native-page-layout"

const REASON_KEY = "reason"
const REASON_AUTH_FAILED = "auth-failed"
const ENABLE_ADMIN_LOGIN_GUARD = false
const ADMIN_LOGIN_EMAIL_KEY = "medusa_admin_login_email"
const ADMIN_LANG_CODE = "zhCN"
const ADMIN_LANG_RELOAD_KEY = "medusa_admin_lang_reload_once"
const ADMIN_REMEMBER_TOKEN_KEY = "medusa_admin_login_token"
const ADMIN_REMEMBER_TOKEN_EXPIRES_AT_KEY = "medusa_admin_login_token_expires_at"
const ADMIN_REMEMBER_TOKEN_TTL_MS = 30 * 60 * 1000

function saveAdminLoginEmail(value?: string) {
  const email = (value || "").trim()
  if (!email) {
    return
  }
  localStorage.setItem(ADMIN_LOGIN_EMAIL_KEY, email)
}

function extractEmailFromLoginRequest(init?: RequestInit): string | undefined {
  const body = init?.body
  if (!body) return undefined

  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body) as { email?: string }
      return parsed?.email
    } catch {
      return undefined
    }
  }

  if (body instanceof URLSearchParams) {
    return body.get("email") ?? undefined
  }

  if (body instanceof FormData) {
    const email = body.get("email")
    return typeof email === "string" ? email : undefined
  }

  return undefined
}

function saveAdminLoginToken(token?: string) {
  const value = (token || "").trim()
  if (!value) {
    return
  }
  localStorage.setItem(ADMIN_REMEMBER_TOKEN_KEY, value)
  localStorage.setItem(
    ADMIN_REMEMBER_TOKEN_EXPIRES_AT_KEY,
    String(Date.now() + ADMIN_REMEMBER_TOKEN_TTL_MS)
  )
}

function clearAdminLoginToken() {
  localStorage.removeItem(ADMIN_REMEMBER_TOKEN_KEY)
  localStorage.removeItem(ADMIN_REMEMBER_TOKEN_EXPIRES_AT_KEY)
}

function getValidAdminLoginToken() {
  const token = localStorage.getItem(ADMIN_REMEMBER_TOKEN_KEY)
  const expiresAt = Number(localStorage.getItem(ADMIN_REMEMBER_TOKEN_EXPIRES_AT_KEY) || "0")
  if (!token || !expiresAt || Number.isNaN(expiresAt) || Date.now() > expiresAt) {
    clearAdminLoginToken()
    return ""
  }
  return token
}

function isAdminLoginCall(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = (init?.method || "GET").toUpperCase()
  if (method !== "POST") {
    return false
  }

  const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
  try {
    const url = new URL(rawUrl, window.location.origin)
    return url.pathname.endsWith("/auth/user/emailpass")
  } catch {
    return false
  }
}

function appendReasonToLoginUrl() {
  const url = new URL(window.location.href)
  url.pathname = "/app/login"
  url.searchParams.set(REASON_KEY, REASON_AUTH_FAILED)
  return url.toString()
}

function isAuthSessionDeleteCall(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = (init?.method || "GET").toUpperCase()
  if (method !== "DELETE") {
    return false
  }
  const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
  try {
    const url = new URL(rawUrl, window.location.origin)
    return url.pathname.endsWith("/auth/session")
  } catch {
    return false
  }
}

async function enforceAdminUser(fetchImpl: typeof window.fetch) {
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  // The auth/session cookie may not be fully available right after login.
  // Retry briefly before deciding the account is non-admin.
  for (let i = 0; i < 6; i++) {
    const me = await fetchImpl("/admin/users/me", { credentials: "include" })
    if (me.ok) {
      return
    }

    await wait(250)
  }

  await fetchImpl("/auth/session", {
    method: "DELETE",
    credentials: "include",
  })
  window.location.assign(appendReasonToLoginUrl())
}

function useInstallLoginGuard() {
  useEffect(() => {
    if (!ENABLE_ADMIN_LOGIN_GUARD) {
      return
    }

    const marker = "__medusa_admin_login_guard_installed__"
    const globalScope = window as unknown as Record<string, unknown>
    if (globalScope[marker]) {
      return
    }
    globalScope[marker] = true

    const originalFetch = window.fetch.bind(window)
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        if (isAdminLoginCall(input, init)) {
          saveAdminLoginEmail(extractEmailFromLoginRequest(init))
        }
        if (isAuthSessionDeleteCall(input, init)) {
          clearAdminLoginToken()
        }
      } catch {
        // Never block request due to helper logic.
      }

      const response = await originalFetch(input, init)

      try {
        if (isAdminLoginCall(input, init) && response.ok) {
          void response
            .clone()
            .json()
            .then((data: unknown) => {
              const token =
                data && typeof data === "object" && "token" in data
                  ? String((data as { token?: string }).token || "")
                  : ""
              saveAdminLoginToken(token)
            })
            .catch(() => {})

          setTimeout(() => {
            void enforceAdminUser(originalFetch)
          }, 150)
        }
      } catch {
        // Never block request due to helper logic.
      }

      return response
    }
  }, [])
}

function useRestoreAdminSession() {
  useEffect(() => {
    const marker = "__medusa_admin_session_restore_installed__"
    const globalScope = window as unknown as Record<string, unknown>
    if (globalScope[marker]) {
      return
    }
    globalScope[marker] = true

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
    const tryRestore = async () => {
      const token = getValidAdminLoginToken()
      if (!token) {
        return
      }

      for (let i = 0; i < 8; i++) {
        try {
          const me = await fetch("/admin/users/me", { credentials: "include" })
          if (me.ok) {
            return
          }

          const restore = await fetch("/auth/session", {
            method: "POST",
            headers: {
              authorization: `Bearer ${token}`,
            },
            credentials: "include",
          })

          if (restore.ok) {
            if (/^\/app\/login\/?$/.test(window.location.pathname)) {
              window.location.assign("/app")
            }
            return
          }

          if (restore.status === 401 || restore.status === 403) {
            clearAdminLoginToken()
            return
          }
        } catch {
          // Backend may be restarting; retry briefly.
        }
        await wait(1500)
      }
    }

    void tryRestore()
  }, [])
}

function useInstallAdminTitle() {
  useEffect(() => {
    const marker = "__medusa_admin_title_installed__"
    const globalScope = window as unknown as Record<string, unknown>
    if (globalScope[marker]) {
      return
    }
    globalScope[marker] = true

    const applyTitle = () => {
      const language = getAdminLanguage()
      const title = language === "zhCN" ? "Art Store 管理后台" : "Art Store Admin"
      if (document.title !== title) {
        document.title = title
      }
    }

    applyTitle()

    const wrapHistoryMethod = (method: "pushState" | "replaceState") => {
      const original = window.history[method].bind(window.history)
      window.history[method] = ((...args: Parameters<History["pushState"]>) => {
        const result = original(...args)
        queueMicrotask(applyTitle)
        return result
      }) as History["pushState"]
    }

    wrapHistoryMethod("pushState")
    wrapHistoryMethod("replaceState")

    window.addEventListener("popstate", applyTitle)
    window.addEventListener("hashchange", applyTitle)

    const observer = new MutationObserver(() => applyTitle())
    observer.observe(document.querySelector("title") ?? document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    })
  }, [])
}

function useCustomizeLoginHeading() {
  useEffect(() => {
    const marker = "__medusa_admin_login_heading_customized__"
    const globalScope = window as unknown as Record<string, unknown>
    if (globalScope[marker]) {
      return
    }
    globalScope[marker] = true

    const apply = () => {
      if (!/^\/app\/login\/?$/.test(window.location.pathname)) {
        return
      }

      const candidates = Array.from(document.querySelectorAll<HTMLElement>("h1, h2"))
      const target =
        candidates.find((el) => {
          const text = (el.textContent || "").trim().toLowerCase()
          return text.includes("medusa") || text.includes("欢迎使用")
        }) ?? candidates[0]

      if (!target) {
        return
      }

      const language = getAdminLanguage()
      target.textContent = language === "zhCN" ? "Art Store 管理后台" : "Art Store Admin"
      target.style.fontSize = "34px"
      target.style.lineHeight = "1.12"
      target.style.fontWeight = "800"
      target.style.letterSpacing = "0.01em"
    }

    apply()
    const observer = new MutationObserver(() => apply())
    observer.observe(document.body, { subtree: true, childList: true, characterData: true })
    window.addEventListener("popstate", apply)
    window.addEventListener("hashchange", apply)
  }, [])
}

function useRememberLoginEmail() {
  useEffect(() => {
    const marker = "__medusa_admin_login_email_remember_installed__"
    const globalScope = window as unknown as Record<string, unknown>
    if (globalScope[marker]) {
      return
    }
    globalScope[marker] = true

    const onLoginPage = () => /^\/app\/login\/?$/.test(window.location.pathname)
    const bind = () => {
      if (!onLoginPage()) {
        return
      }

      const input = document.querySelector<HTMLInputElement>(
        'input[type="email"], input[name="email"], input[autocomplete="email"]'
      )
      if (!input) {
        return
      }

      const saved = localStorage.getItem(ADMIN_LOGIN_EMAIL_KEY)
      if (saved && !input.value) {
        input.value = saved
        input.dispatchEvent(new Event("input", { bubbles: true }))
        input.dispatchEvent(new Event("change", { bubbles: true }))
      }

      if (!input.dataset.rememberEmailBound) {
        const handler = () => saveAdminLoginEmail(input.value)
        input.addEventListener("input", handler)
        input.addEventListener("blur", handler)
        input.dataset.rememberEmailBound = "true"
      }

      const form = input.form ?? document.querySelector<HTMLFormElement>("form")
      if (form && !form.dataset.rememberEmailBound) {
        form.addEventListener("submit", () => saveAdminLoginEmail(input.value))
        form.dataset.rememberEmailBound = "true"
      }
    }

    bind()
    const observer = new MutationObserver(() => bind())
    observer.observe(document.body, { subtree: true, childList: true })
    window.addEventListener("popstate", bind)
    window.addEventListener("hashchange", bind)
  }, [])
}

function useApplyAdminTheme() {
  useEffect(() => {
    const id = "medusa-admin-soft-yellow-theme"
    const style = document.getElementById(id) ?? document.createElement("style")
    style.id = id
    style.textContent = `
      body, #root {
        background: radial-gradient(circle at top left, ${adminTheme.color.highlight} 0%, transparent 22%), linear-gradient(180deg, ${adminTheme.color.canvas} 0%, ${adminTheme.color.canvasAlt} 100%) !important;
      }
      [class*="bg-ui-bg-base"], [class*="bg-ui-bg-subtle"], [class*="bg-ui-bg-component"] {
        background-color: ${adminTheme.color.surface} !important;
      }
      [class*="border-ui-border"], [class*="border-ui-border-base"], [class*="border-ui-border-component"] {
        border-color: ${adminTheme.color.border} !important;
      }
      [class*="shadow-elevation-card-rest"], [class*="shadow-borders-base"] {
        box-shadow: ${adminTheme.shadow.card} !important;
      }
      [class*="rounded-xl"], [class*="rounded-lg"] {
        border-radius: ${adminTheme.radius.md}px !important;
      }
      a, button {
        transition: box-shadow 140ms ease, border-color 140ms ease, transform 140ms ease !important;
      }
      button:focus-visible,
      a:focus-visible,
      [role="button"]:focus-visible {
        outline: 2px solid ${adminTheme.color.primary} !important;
        outline-offset: 2px !important;
      }
      [class*="text-ui-fg-base"] {
        color: ${adminTheme.color.text} !important;
      }
      [class*="text-ui-fg-subtle"], [class*="text-ui-fg-muted"] {
        color: ${adminTheme.color.textMuted} !important;
      }
      [class*="bg-ui-button-neutral"], [class*="bg-ui-bg-field"], [class*="bg-ui-bg-interactive"] {
        background-color: ${adminTheme.color.surface} !important;
      }
      [class*="border-ui-border-interactive"], [class*="border-ui-border-strong"] {
        border-color: ${adminTheme.color.borderStrong} !important;
      }
      body[data-admin-route="orders"] thead th {
        background: ${adminTheme.color.surfaceMuted} !important;
        color: ${adminTheme.color.textMuted} !important;
        border-bottom: 1px solid ${adminTheme.color.border} !important;
      }
      body[data-admin-route="orders"] tbody td {
        border-bottom: 1px solid ${adminTheme.color.border} !important;
      }
      body[data-admin-route="orders"] tbody tr:hover td {
        background: ${adminTheme.color.primarySoft} !important;
      }
      body[data-admin-route="orders"] input,
      body[data-admin-route="orders"] select,
      body[data-admin-route="orders"] textarea {
        border-color: ${adminTheme.color.border} !important;
        border-radius: ${adminTheme.radius.sm}px !important;
        background: ${adminTheme.color.surface} !important;
        color: ${adminTheme.color.text} !important;
        box-shadow: ${adminTheme.shadow.soft} !important;
      }
      body[data-admin-route="orders"] button:not([role="checkbox"]):not([role="radio"]) {
        border-radius: 999px !important;
      }
      body[data-admin-route="orders"] [class*="text-ui-fg-disabled"] {
        color: ${adminTheme.color.textMuted} !important;
        opacity: 0.8 !important;
      }
      body[data-admin-route="orders"] tbody td,
      body[data-admin-route="orders"] thead th {
        padding-top: 12px !important;
        padding-bottom: 12px !important;
      }
      body[data-admin-route="orders"] [class*="pagination"] button,
      body[data-admin-route="orders"] nav button {
        border-radius: 999px !important;
        border-color: ${adminTheme.color.border} !important;
      }
      body[data-admin-route="orders"] h1 + p,
      body[data-admin-route="orders"] h2 + p,
      body[data-admin-route="orders"] h3 + p {
        color: ${adminTheme.color.textMuted} !important;
      }
      [data-native-hero-hidden="true"] {
        display: none !important;
      }

      /* Make checkbox/radio selected state obvious across admin pages. */
      input[type="checkbox"] {
        -webkit-appearance: none !important;
        appearance: none !important;
        width: 16px !important;
        height: 16px !important;
        border: 1.5px solid ${adminTheme.color.primary} !important;
        border-radius: 4px !important;
        background: ${adminTheme.color.surface} !important;
        display: inline-grid !important;
        place-content: center !important;
        margin: 0 !important;
        vertical-align: middle !important;
      }
      input[type="checkbox"]::before {
        content: "" !important;
        width: 10px !important;
        height: 10px !important;
        transform: scale(0) !important;
        transition: transform 120ms ease-in-out !important;
        clip-path: polygon(14% 44%, 0 60%, 38% 100%, 100% 20%, 84% 6%, 36% 67%) !important;
        background: ${adminTheme.color.primaryText} !important;
      }
      input[type="checkbox"]:checked {
        background: ${adminTheme.color.primary} !important;
        border-color: ${adminTheme.color.primary} !important;
      }
      input[type="checkbox"]:checked::before {
        transform: scale(1) !important;
      }

      input[type="radio"] {
        -webkit-appearance: none !important;
        appearance: none !important;
        width: 16px !important;
        height: 16px !important;
        border: 1.5px solid ${adminTheme.color.primary} !important;
        border-radius: 999px !important;
        background: ${adminTheme.color.surface} !important;
        display: inline-grid !important;
        place-content: center !important;
        margin: 0 !important;
        vertical-align: middle !important;
      }
      input[type="radio"]::before {
        content: "" !important;
        width: 8px !important;
        height: 8px !important;
        border-radius: 999px !important;
        transform: scale(0) !important;
        transition: transform 120ms ease-in-out !important;
        background: ${adminTheme.color.primaryText} !important;
      }
      input[type="radio"]:checked {
        background: ${adminTheme.color.primary} !important;
        border-color: ${adminTheme.color.primary} !important;
      }
      input[type="radio"]:checked::before {
        transform: scale(1) !important;
      }

      [role="checkbox"][data-state="checked"] {
        background-color: ${adminTheme.color.primary} !important;
        border-color: ${adminTheme.color.primary} !important;
      }
      button[role="checkbox"][data-state="checked"],
      [role="checkbox"][aria-checked="true"],
      button[aria-checked="true"] {
        background-color: ${adminTheme.color.primary} !important;
        border-color: ${adminTheme.color.primary} !important;
        color: ${adminTheme.color.primaryText} !important;
      }
      [role="checkbox"][data-state="checked"] svg,
      button[role="checkbox"][data-state="checked"] svg,
      [role="checkbox"][aria-checked="true"] svg {
        color: ${adminTheme.color.primaryText} !important;
        stroke: ${adminTheme.color.primaryText} !important;
      }
      button[role="checkbox"][data-state="checked"]::after,
      [role="checkbox"][aria-checked="true"]::after,
      button[aria-checked="true"]::after {
        content: "✓" !important;
        color: ${adminTheme.color.primaryText} !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        line-height: 1 !important;
      }

      [role="radio"][data-state="checked"] {
        background-color: ${adminTheme.color.primary} !important;
        border-color: ${adminTheme.color.primary} !important;
      }
      button[role="radio"][data-state="checked"],
      [role="radio"][aria-checked="true"] {
        background-color: ${adminTheme.color.primary} !important;
        border-color: ${adminTheme.color.primary} !important;
      }
    `
    if (!style.parentElement) {
      document.head.appendChild(style)
    }
  }, [])
}

function useSyncOrderListRouteBody() {
  useEffect(() => {
    const apply = () => syncAdminRouteBody(/^\/app\/orders\/?$/, "orders")

    apply()
    const observer = new MutationObserver(() => apply())
    observer.observe(document.body, { subtree: true, childList: true })
    window.addEventListener("popstate", apply)
    window.addEventListener("hashchange", apply)

    return () => {
      observer.disconnect()
      window.removeEventListener("popstate", apply)
      window.removeEventListener("hashchange", apply)
    }
  }, [])
}

function useForceAdminChinese() {
  useEffect(() => {
    const current = localStorage.getItem("lng")
    const hasCookie = document.cookie
      .split(";")
      .map((v) => v.trim())
      .some((pair) => pair === `lng=${ADMIN_LANG_CODE}`)

    const nextLanguage = current || ADMIN_LANG_CODE
    const changed = current !== nextLanguage || !hasCookie
    if (!changed && current) {
      return
    }

    localStorage.setItem("lng", nextLanguage)
    document.cookie = `lng=${nextLanguage}; path=/; max-age=31536000; samesite=lax`

    if (!current && !sessionStorage.getItem(ADMIN_LANG_RELOAD_KEY)) {
      sessionStorage.setItem(ADMIN_LANG_RELOAD_KEY, "1")
      window.location.reload()
    }
  }, [])
}

const AdminLoginGuardWidget = () => {
  const { t } = useAdminLanguage()
  useForceAdminChinese()
  useRestoreAdminSession()
  useInstallLoginGuard()
  useInstallAdminTitle()
  useCustomizeLoginHeading()
  useRememberLoginEmail()
  useApplyAdminTheme()
  useSyncOrderListRouteBody()

  const isLogin = useMemo(() => /^\/app\/login\/?$/.test(window.location.pathname), [])
  const [showMessage, setShowMessage] = useState(false)

  useEffect(() => {
    if (!isLogin) {
      return
    }

    const params = new URLSearchParams(window.location.search)
    if (params.get(REASON_KEY) !== REASON_AUTH_FAILED) {
      return
    }

    setShowMessage(true)
    params.delete(REASON_KEY)
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`
    window.history.replaceState(null, "", next)
  }, [isLogin])

  return (
    <>
      {isLogin && showMessage ? (
        <div
          style={{
            marginTop: 12,
            border: `1px solid ${adminTheme.color.danger}`,
            background: adminTheme.color.dangerSoft,
            color: adminTheme.color.danger,
            borderRadius: 10,
            padding: "8px 10px",
            fontSize: 13,
          }}
        >
          {t("邮箱或密码错误。", "Incorrect email or password.")}
        </div>
      ) : null}
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "order.list.before",
})

export default AdminLoginGuardWidget
