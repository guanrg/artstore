import { defineRouteConfig } from "@medusajs/admin-sdk"
import type { CSSProperties } from "react"
import YahooImportForm from "../../components/yahoo-import-form"
import { useAdminLanguage } from "../../lib/admin-language"
import { adminTheme } from "../../lib/admin-theme"
import ReportHeader from "../reports/components/report-header"

const pageStyle: CSSProperties = {
  minHeight: "100%",
  padding: 16,
  background: `radial-gradient(circle at top left, ${adminTheme.color.highlight} 0%, transparent 24%), linear-gradient(180deg, ${adminTheme.color.canvas} 0%, ${adminTheme.color.canvasAlt} 100%)`,
  display: "grid",
  gap: 16,
}

const YahooImportPage = () => {
  const { t } = useAdminLanguage()

  return (
    <div style={pageStyle}>
      <ReportHeader
        title={t("Yahoo 拍卖导入", "Yahoo Auction Import")}
        crumbs={[
          { label: t("商品", "Products"), href: "/app/products" },
          { label: t("Yahoo 导入", "Yahoo Import") },
        ]}
      />

      <YahooImportForm />
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Yahoo 导入",
  rank: 71,
})

export default YahooImportPage
