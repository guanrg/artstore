import { defineRouteConfig } from "@medusajs/admin-sdk"
import SchemaDocsView from "../schema-docs/schema-docs-view"

const SchemaPricingPage = () => {
  return <SchemaDocsView titleZh="数据库表定义（区域税费与价格）" titleEn="Database Schema (Pricing)" category="pricing" />
}

export const config = defineRouteConfig({
  rank: 204,
})

export default SchemaPricingPage
