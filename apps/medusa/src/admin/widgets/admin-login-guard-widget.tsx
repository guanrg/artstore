import { useEffect, useMemo, useState } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"

const REASON_KEY = "reason"
const REASON_AUTH_FAILED = "auth-failed"
const ENABLE_ADMIN_LOGIN_GUARD = true
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

    const title = "Art Store Admin"
    const applyTitle = () => {
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

      target.textContent = "Art Store Admin"
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
    if (document.getElementById(id)) {
      return
    }

    const style = document.createElement("style")
    style.id = id
    style.textContent = `
      body, #root {
        background: #fff8dc !important;
      }
      [class*="bg-ui-bg-base"], [class*="bg-ui-bg-subtle"], [class*="bg-ui-bg-component"] {
        background-color: #fff6cf !important;
      }
      [class*="border-ui-border"], [class*="border-ui-border-base"], [class*="border-ui-border-component"] {
        border-color: #e8dca8 !important;
      }

      /* Make checkbox/radio selected state obvious across admin pages. */
      input[type="checkbox"] {
        -webkit-appearance: none !important;
        appearance: none !important;
        width: 16px !important;
        height: 16px !important;
        border: 1.5px solid #111827 !important;
        border-radius: 4px !important;
        background: #ffffff !important;
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
        background: #ffffff !important;
      }
      input[type="checkbox"]:checked {
        background: #111827 !important;
        border-color: #111827 !important;
      }
      input[type="checkbox"]:checked::before {
        transform: scale(1) !important;
      }

      input[type="radio"] {
        -webkit-appearance: none !important;
        appearance: none !important;
        width: 16px !important;
        height: 16px !important;
        border: 1.5px solid #111827 !important;
        border-radius: 999px !important;
        background: #ffffff !important;
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
        background: #ffffff !important;
      }
      input[type="radio"]:checked {
        background: #111827 !important;
        border-color: #111827 !important;
      }
      input[type="radio"]:checked::before {
        transform: scale(1) !important;
      }

      [role="checkbox"][data-state="checked"] {
        background-color: #111827 !important;
        border-color: #111827 !important;
      }
      button[role="checkbox"][data-state="checked"],
      [role="checkbox"][aria-checked="true"],
      button[aria-checked="true"] {
        background-color: #111827 !important;
        border-color: #111827 !important;
        color: #ffffff !important;
      }
      [role="checkbox"][data-state="checked"] svg,
      button[role="checkbox"][data-state="checked"] svg,
      [role="checkbox"][aria-checked="true"] svg {
        color: #ffffff !important;
        stroke: #ffffff !important;
      }
      button[role="checkbox"][data-state="checked"]::after,
      [role="checkbox"][aria-checked="true"]::after,
      button[aria-checked="true"]::after {
        content: "✓" !important;
        color: #ffffff !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        line-height: 1 !important;
      }

      [role="radio"][data-state="checked"] {
        background-color: #111827 !important;
        border-color: #111827 !important;
      }
      button[role="radio"][data-state="checked"],
      [role="radio"][aria-checked="true"] {
        background-color: #111827 !important;
        border-color: #111827 !important;
      }
    `
    document.head.appendChild(style)
  }, [])
}

function useForceAdminChinese() {
  useEffect(() => {
    const current = localStorage.getItem("lng")
    const hasCookie = document.cookie
      .split(";")
      .map((v) => v.trim())
      .some((pair) => pair === `lng=${ADMIN_LANG_CODE}`)

    const changed = current !== ADMIN_LANG_CODE || !hasCookie
    if (!changed) {
      return
    }

    localStorage.setItem("lng", ADMIN_LANG_CODE)
    document.cookie = `lng=${ADMIN_LANG_CODE}; path=/; max-age=31536000; samesite=lax`

    if (!sessionStorage.getItem(ADMIN_LANG_RELOAD_KEY)) {
      sessionStorage.setItem(ADMIN_LANG_RELOAD_KEY, "1")
      window.location.reload()
    }
  }, [])
}

const AdminLoginGuardWidget = () => {
  useForceAdminChinese()
  useRestoreAdminSession()
  useInstallLoginGuard()
  useInstallAdminTitle()
  useCustomizeLoginHeading()
  useRememberLoginEmail()
  useApplyAdminTheme()

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

  if (!isLogin || !showMessage) {
    return null
  }

  return (
    <div
      style={{
        marginTop: 12,
        border: "1px solid #f3c6c6",
        background: "#fff7f7",
        color: "#b42318",
        borderRadius: 8,
        padding: "8px 10px",
        fontSize: 13,
      }}
    >
      邮箱或密码错误。
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: ["login.after", "order.list.before"],
})

export default AdminLoginGuardWidget
