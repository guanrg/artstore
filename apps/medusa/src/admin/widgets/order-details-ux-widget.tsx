import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"
import AdminLanguageDock from "../components/admin-language-dock"
import NativePageHero from "../components/native-page-hero"
import { patchNativePageLayout } from "../lib/native-page-layout"
import { useAdminLanguage } from "../lib/admin-language"

function isOrderDetailsRoute() {
  return /^\/app\/orders\/[^/]+\/?$/.test(window.location.pathname)
}

function usePatchOrderDetailsPage() {
  useEffect(() => {
    const apply = () => {
      patchNativePageLayout({
        routePattern: /^\/app\/orders\/[^/]+\/?$/,
        bodyRoute: "orders",
        heroTitleKeywords: ["summary", "timeline", "order", "订单"],
        heroShellAttr: "orderPageShell",
        actionHostKey: "orders-detail",
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

const OrderDetailsUxWidget = () => {
  const { t } = useAdminLanguage()

  usePatchOrderDetailsPage()

  if (!isOrderDetailsRoute()) {
    return null
  }

  return (
    <>
      <NativePageHero
        title={t("订单", "Order")}
        pageKey="orders-detail"
      />
      <AdminLanguageDock />
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.before",
})

export default OrderDetailsUxWidget
