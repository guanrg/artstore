import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"
import AdminLanguageDock from "../components/admin-language-dock"
import NativePageHero from "../components/native-page-hero"
import { patchNativePageLayout } from "../lib/native-page-layout"
import { useAdminLanguage } from "../lib/admin-language"
import { adminTheme } from "../lib/admin-theme"

function isCustomerListRoute() {
  return /^\/app\/customers\/?$/.test(window.location.pathname)
}

function useApplyCustomerTheme() {
  useEffect(() => {
    const id = "medusa-admin-customer-theme"
    if (document.getElementById(id)) {
      return
    }

    const style = document.createElement("style")
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
      body[data-admin-route="customers"] [data-customer-page-shell="true"] {
        background: linear-gradient(135deg, ${adminTheme.color.surfaceMuted} 0%, ${adminTheme.color.primarySoft} 58%, ${adminTheme.color.surface} 100%) !important;
        border: 1px solid ${adminTheme.color.border} !important;
        border-radius: ${adminTheme.radius.lg}px !important;
        box-shadow: ${adminTheme.shadow.card} !important;
        padding: 14px !important;
        margin-bottom: 14px !important;
      }
      body[data-admin-route="customers"] [data-customer-filter-shell="true"] {
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

function usePatchCustomerListPage() {
  useEffect(() => {
    const apply = () => {
      patchNativePageLayout({
        routePattern: /^\/app\/customers\/?$/,
        bodyRoute: "customers",
        heroTitleKeywords: ["customer", "客户"],
        heroShellAttr: "customerPageShell",
        actionHostKey: "customers-list",
        filterShellAttr: "customerFilterShell",
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

const CustomerListUxWidget = () => {
  const { t } = useAdminLanguage()

  useApplyCustomerTheme()
  usePatchCustomerListPage()

  if (!isCustomerListRoute()) {
    return null
  }

  return (
    <>
      <NativePageHero
        title={t("客户", "Customers")}
        pageKey="customers-list"
      />
      <AdminLanguageDock />
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.list.before",
})

export default CustomerListUxWidget
