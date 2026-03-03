import { useEffect, useMemo, useState } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"

const REASON_KEY = "reason"
const REASON_AUTH_FAILED = "auth-failed"
const ENABLE_ADMIN_LOGIN_GUARD = true
const ADMIN_LOGIN_EMAIL_KEY = "medusa_admin_login_email"

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
      const response = await originalFetch(input, init)

      if (isAdminLoginCall(input, init) && response.ok) {
        setTimeout(() => {
          void enforceAdminUser(originalFetch)
        }, 150)
      }

      return response
    }
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

function useRememberLoginEmail() {
  useEffect(() => {
    const marker = "__medusa_admin_login_email_remember_installed__"
    const globalScope = window as unknown as Record<string, unknown>
    if (globalScope[marker]) {
      return
    }
    globalScope[marker] = true

    const onLoginPage = () => /^\/app\/login\/?$/.test(window.location.pathname)
    const saveEmail = (value?: string) => {
      const email = (value || "").trim()
      if (!email) {
        return
      }
      localStorage.setItem(ADMIN_LOGIN_EMAIL_KEY, email)
    }

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
      }

      if (!input.dataset.rememberEmailBound) {
        const handler = () => saveEmail(input.value)
        input.addEventListener("input", handler)
        input.addEventListener("blur", handler)
        input.dataset.rememberEmailBound = "true"
      }

      const form = input.form ?? document.querySelector<HTMLFormElement>("form")
      if (form && !form.dataset.rememberEmailBound) {
        form.addEventListener("submit", () => saveEmail(input.value))
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
    `
    document.head.appendChild(style)
  }, [])
}

const AdminLoginGuardWidget = () => {
  useInstallLoginGuard()
  useInstallAdminTitle()
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
      Invalid email or password.
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: ["login.after", "order.list.before"],
})

export default AdminLoginGuardWidget
