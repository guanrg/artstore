import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"
import { syncAdminRouteBody } from "../lib/native-page-layout"
import { adminTheme } from "../lib/admin-theme"

function isProductListRoute() {
  return /^\/app\/products\/?$/.test(window.location.pathname)
}

function useApplyProductTheme() {
  useEffect(() => {
    const id = "medusa-admin-product-theme"
    const style = document.getElementById(id) ?? document.createElement("style")
    style.id = id
    style.textContent = `
      body[data-admin-route="products"] {
        background: radial-gradient(circle at top left, ${adminTheme.color.highlight} 0%, transparent 22%), linear-gradient(180deg, ${adminTheme.color.canvas} 0%, ${adminTheme.color.canvasAlt} 100%) !important;
      }
      body[data-admin-route="products"] [class*="bg-ui-bg-base"],
      body[data-admin-route="products"] [class*="bg-ui-bg-subtle"],
      body[data-admin-route="products"] [class*="bg-ui-bg-component"] {
        background-color: ${adminTheme.color.surface} !important;
      }
      body[data-admin-route="products"] [class*="border-ui-border"],
      body[data-admin-route="products"] [class*="border-ui-border-base"],
      body[data-admin-route="products"] [class*="border-ui-border-component"] {
        border-color: ${adminTheme.color.border} !important;
      }
      body[data-admin-route="products"] [class*="shadow-elevation-card-rest"],
      body[data-admin-route="products"] [class*="shadow-borders-base"] {
        box-shadow: ${adminTheme.shadow.card} !important;
      }
      body[data-admin-route="products"] thead th {
        background: ${adminTheme.color.surfaceMuted} !important;
        color: ${adminTheme.color.textMuted} !important;
        border-bottom: 1px solid ${adminTheme.color.border} !important;
      }
      body[data-admin-route="products"] tbody td {
        border-bottom: 1px solid ${adminTheme.color.border} !important;
      }
      body[data-admin-route="products"] tbody tr:hover td {
        background: ${adminTheme.color.primarySoft} !important;
      }
      body[data-admin-route="products"] input,
      body[data-admin-route="products"] select,
      body[data-admin-route="products"] textarea {
        border-color: ${adminTheme.color.border} !important;
        border-radius: ${adminTheme.radius.sm}px !important;
        background: ${adminTheme.color.surface} !important;
        color: ${adminTheme.color.text} !important;
        box-shadow: ${adminTheme.shadow.soft} !important;
      }
      body[data-admin-route="products"] button:not([role="checkbox"]):not([role="radio"]) {
        border-radius: 999px !important;
      }
      body[data-admin-route="products"] [data-product-page-shell="true"] {
        background: linear-gradient(135deg, ${adminTheme.color.surfaceMuted} 0%, ${adminTheme.color.primarySoft} 58%, ${adminTheme.color.surface} 100%) !important;
        border: 1px solid ${adminTheme.color.border} !important;
        border-radius: ${adminTheme.radius.lg}px !important;
        box-shadow: ${adminTheme.shadow.card} !important;
        padding: 14px !important;
        margin-bottom: 14px !important;
      }
      body[data-admin-route="products"] [data-product-filter-shell="true"] {
        background: ${adminTheme.color.surface} !important;
        border: 1px solid ${adminTheme.color.border} !important;
        border-radius: ${adminTheme.radius.md}px !important;
        box-shadow: ${adminTheme.shadow.card} !important;
        padding: 12px !important;
        margin-bottom: 12px !important;
      }
      body[data-admin-route="products"] [data-product-filter-shell="true"] button {
        font-weight: 700 !important;
      }
      body[data-admin-route="products"] [class*="text-ui-fg-muted"],
      body[data-admin-route="products"] [class*="text-ui-fg-subtle"] {
        color: ${adminTheme.color.textMuted} !important;
      }
      body[data-admin-route="products"] [class*="text-ui-fg-disabled"] {
        color: ${adminTheme.color.textMuted} !important;
        opacity: 0.8 !important;
      }
      body[data-admin-route="products"] tbody td,
      body[data-admin-route="products"] thead th {
        padding-top: 12px !important;
        padding-bottom: 12px !important;
      }
      body[data-admin-route="products"] [class*="pagination"] button,
      body[data-admin-route="products"] nav button {
        border-radius: 999px !important;
        border-color: ${adminTheme.color.border} !important;
      }
      body[data-admin-route="products"] h1 + p,
      body[data-admin-route="products"] h2 + p,
      body[data-admin-route="products"] h3 + p {
        color: ${adminTheme.color.textMuted} !important;
      }
    `
    if (!style.parentElement) {
      document.head.appendChild(style)
    }
  }, [])
}

function useSyncProductRouteBody() {
  useEffect(() => {
    const apply = () => syncAdminRouteBody(/^\/app\/products\/?$/, "products")

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

const ProductListUxWidget = () => {
  useApplyProductTheme()
  useSyncProductRouteBody()

  if (!isProductListRoute()) {
    return null
  }

  return null
}

export const config = defineWidgetConfig({
  zone: "product.list.before",
})

export default ProductListUxWidget
