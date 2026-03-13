import { defineRouteConfig } from "@medusajs/admin-sdk"
import SchemaDocsView from "../schema-docs/schema-docs-view"

const SchemaCrmPage = () => {
  return <SchemaDocsView titleZh="数据库表定义（CRM）" titleEn="Database Schema (CRM)" category="crm" />
}

export const config = defineRouteConfig({
  rank: 206,
})

export default SchemaCrmPage
