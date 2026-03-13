import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"
import { syncAdminRouteBody } from "../lib/native-page-layout"
import { adminTheme } from "../lib/admin-theme"

function isOrderDetailsRoute() {
  return /^\/app\/orders\/[^/]+\/?$/.test(window.location.pathname)
}

function useApplyOrderDetailsTheme() {
  useEffect(() => {
    const id = "medusa-admin-order-details-theme"
    const style = document.getElementById(id) ?? document.createElement("style")
    style.id = id
    style.textContent = `
      body[data-admin-route="orders"] [data-order-page-shell="true"] {
        background: ${adminTheme.color.surface} !important;
        border: 1px solid ${adminTheme.color.border} !important;
        border-radius: ${adminTheme.radius.lg}px !important;
        box-shadow: ${adminTheme.shadow.card} !important;
        padding: 14px !important;
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
      body[data-admin-route="orders"] h1,
      body[data-admin-route="orders"] h2,
      body[data-admin-route="orders"] h3 {
        color: ${adminTheme.color.text} !important;
      }
      body[data-admin-route="orders"] h1 + p,
      body[data-admin-route="orders"] h2 + p,
      body[data-admin-route="orders"] h3 + p {
        color: ${adminTheme.color.textMuted} !important;
      }
    `
    if (!style.parentElement) {
      document.head.appendChild(style)
    }
  }, [])
}

function useSyncOrderDetailsRouteBody() {
  useEffect(() => {
    const apply = () => syncAdminRouteBody(/^\/app\/orders\/[^/]+\/?$/, "orders")

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

const OrderDetailsUxWidget = () => {
  useApplyOrderDetailsTheme()
  useSyncOrderDetailsRouteBody()

  if (!isOrderDetailsRoute()) {
    return null
  }

  return null
}

export const config = defineWidgetConfig({
  zone: "order.details.before",
})

export default OrderDetailsUxWidget
