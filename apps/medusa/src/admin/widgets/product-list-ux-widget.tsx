import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"
import AdminLanguageDock from "../components/admin-language-dock"
import NativePageHero from "../components/native-page-hero"
import { patchNativePageLayout } from "../lib/native-page-layout"
import { useAdminLanguage } from "../lib/admin-language"
import { adminTheme } from "../lib/admin-theme"

function isProductListRoute() {
  return /^\/app\/products\/?$/.test(window.location.pathname)
}

function useApplyProductTheme() {
  useEffect(() => {
    const id = "medusa-admin-product-theme"
    if (document.getElementById(id)) {
      return
    }

    const style = document.createElement("style")
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
    `
    document.head.appendChild(style)
  }, [])
}

function usePatchProductListPage() {
  useEffect(() => {
    const apply = () => {
      patchNativePageLayout({
        routePattern: /^\/app\/products\/?$/,
        bodyRoute: "products",
        heroTitleKeywords: ["product", "产品", "商品"],
        heroShellAttr: "productPageShell",
        actionHostKey: "products-list",
        filterShellAttr: "productFilterShell",
      })
    }

    apply()
    const observer = new MutationObserver(() => apply())
    observer.observe(document.body, { subtree: true, childList: true })
    window.addEventListener("popstate", apply)
    window.addEventListener("hashchange", apply)

    return () => observer.disconnect()
  }, [])
}

const ProductListUxWidget = () => {
  const { t } = useAdminLanguage()

  useApplyProductTheme()
  usePatchProductListPage()

  if (!isProductListRoute()) {
    return null
  }

  return (
    <>
      <NativePageHero
        title={t("商品", "Products")}
        pageKey="products-list"
      />
      <AdminLanguageDock />
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "product.list.before",
})

export default ProductListUxWidget
