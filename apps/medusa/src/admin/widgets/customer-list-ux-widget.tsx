import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"
import { syncAdminRouteBody } from "../lib/native-page-layout"
import { adminTheme } from "../lib/admin-theme"

function isCustomerListRoute() {
  return /^\/app\/customers\/?$/.test(window.location.pathname)
}

function useApplyCustomerTheme() {
  useEffect(() => {
    const id = "medusa-admin-customer-theme"
    const style = document.getElementById(id) ?? document.createElement("style")
    style.id = id
    style.textContent = `
      body[data-admin-route="customers"] {
        background: radial-gradient(circle at top left, ${adminTheme.color.highlight} 0%, transparent 22%), linear-gradient(180deg, ${adminTheme.color.canvas} 0%, ${adminTheme.color.canvasAlt} 100%) !important;
      }
      body[data-admin-route="customers"] [class*="bg-ui-bg-base"],
      body[data-admin-route="customers"] [class*="bg-ui-bg-subtle"],
      body[data-admin-route="customers"] [class*="bg-ui-bg-component"] {
        background-color: ${adminTheme.color.surface} !important;
      }
      body[data-admin-route="customers"] [class*="border-ui-border"],
      body[data-admin-route="customers"] [class*="border-ui-border-base"],
      body[data-admin-route="customers"] [class*="border-ui-border-component"] {
        border-color: ${adminTheme.color.border} !important;
      }
      body[data-admin-route="customers"] [class*="shadow-elevation-card-rest"],
      body[data-admin-route="customers"] [class*="shadow-borders-base"] {
        box-shadow: ${adminTheme.shadow.card} !important;
      }
      body[data-admin-route="customers"] thead th {
        background: ${adminTheme.color.surfaceMuted} !important;
        color: ${adminTheme.color.textMuted} !important;
        border-bottom: 1px solid ${adminTheme.color.border} !important;
      }
      body[data-admin-route="customers"] tbody td {
        border-bottom: 1px solid ${adminTheme.color.border} !important;
      }
      body[data-admin-route="customers"] tbody tr:hover td {
        background: ${adminTheme.color.primarySoft} !important;
      }
      body[data-admin-route="customers"] input,
      body[data-admin-route="customers"] select,
      body[data-admin-route="customers"] textarea {
        border-color: ${adminTheme.color.border} !important;
        border-radius: ${adminTheme.radius.sm}px !important;
        background: ${adminTheme.color.surface} !important;
        color: ${adminTheme.color.text} !important;
        box-shadow: ${adminTheme.shadow.soft} !important;
      }
      body[data-admin-route="customers"] button:not([role="checkbox"]):not([role="radio"]) {
        border-radius: 999px !important;
      }
      body[data-admin-route="customers"] [class*="text-ui-fg-muted"],
      body[data-admin-route="customers"] [class*="text-ui-fg-subtle"] {
        color: ${adminTheme.color.textMuted} !important;
      }
      body[data-admin-route="customers"] [class*="text-ui-fg-disabled"] {
        color: ${adminTheme.color.textMuted} !important;
        opacity: 0.8 !important;
      }
      body[data-admin-route="customers"] tbody td,
      body[data-admin-route="customers"] thead th {
        padding-top: 12px !important;
        padding-bottom: 12px !important;
      }
      body[data-admin-route="customers"] [class*="pagination"] button,
      body[data-admin-route="customers"] nav button {
        border-radius: 999px !important;
        border-color: ${adminTheme.color.border} !important;
      }
      body[data-admin-route="customers"] h1 + p,
      body[data-admin-route="customers"] h2 + p,
      body[data-admin-route="customers"] h3 + p {
        color: ${adminTheme.color.textMuted} !important;
      }
    `
    if (!style.parentElement) {
      document.head.appendChild(style)
    }
  }, [])
}

function useSyncCustomerRouteBody() {
  useEffect(() => {
    const apply = () => syncAdminRouteBody(/^\/app\/customers\/?$/, "customers")

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

const CustomerListUxWidget = () => {
  useApplyCustomerTheme()
  useSyncCustomerRouteBody()

  if (!isCustomerListRoute()) {
    return null
  }

  return null
}

export const config = defineWidgetConfig({
  zone: "customer.list.before",
})

export default CustomerListUxWidget
