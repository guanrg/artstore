import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"
import AdminLanguageDock from "../components/admin-language-dock"
import NativePageHero from "../components/native-page-hero"
import { patchNativePageLayout } from "../lib/native-page-layout"
import { useAdminLanguage } from "../lib/admin-language"

function isCustomerDetailsRoute() {
  return /^\/app\/customers\/[^/]+\/?$/.test(window.location.pathname)
}

function usePatchCustomerDetailsPage() {
  useEffect(() => {
    const apply = () => {
      patchNativePageLayout({
        routePattern: /^\/app\/customers\/[^/]+\/?$/,
        bodyRoute: "customers",
        heroTitleKeywords: ["customer", "activity", "客户"],
        heroShellAttr: "customerPageShell",
        actionHostKey: "customers-detail",
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

const CustomerDetailsUxWidget = () => {
  const { t } = useAdminLanguage()

  usePatchCustomerDetailsPage()

  if (!isCustomerDetailsRoute()) {
    return null
  }

  return (
    <>
      <NativePageHero
        title={t("客户", "Customers")}
        pageKey="customers-detail"
      />
      <AdminLanguageDock />
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.details.before",
})

export default CustomerDetailsUxWidget
