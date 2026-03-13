import { defineRouteConfig } from "@medusajs/admin-sdk"
import SchemaDocsView from "../schema-docs/schema-docs-view"

const SchemaOtherPage = () => {
  return <SchemaDocsView titleZh="数据库表定义（其他）" titleEn="Database Schema (Other)" category="other" />
}

export const config = defineRouteConfig({
  rank: 207,
})

export default SchemaOtherPage
