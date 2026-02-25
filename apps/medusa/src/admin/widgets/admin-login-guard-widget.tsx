import { useEffect, useMemo, useState } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"

const REASON_KEY = "reason"
const REASON_NON_ADMIN = "admin-only"

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
  url.searchParams.set(REASON_KEY, REASON_NON_ADMIN)
  return url.toString()
}

async function enforceAdminUser(fetchImpl: typeof window.fetch) {
  const me = await fetchImpl("/admin/users/me", { credentials: "include" })
  if (me.ok) {
    return
  }

  await fetchImpl("/auth/session", {
    method: "DELETE",
    credentials: "include",
  })
  window.location.assign(appendReasonToLoginUrl())
}

function useInstallLoginGuard() {
  useEffect(() => {
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
        queueMicrotask(() => {
          void enforceAdminUser(originalFetch)
        })
      }

      return response
    }
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
  useApplyAdminTheme()

  const isLogin = useMemo(() => /^\/app\/login\/?$/.test(window.location.pathname), [])
  const [showMessage, setShowMessage] = useState(false)

  useEffect(() => {
    if (!isLogin) {
      return
    }

    const params = new URLSearchParams(window.location.search)
    if (params.get(REASON_KEY) !== REASON_NON_ADMIN) {
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
      This account is not an admin user. Please use a backend user account to sign in.
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: ["login.after", "order.list.before"],
})

export default AdminLoginGuardWidget
