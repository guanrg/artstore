import { defineRouteConfig } from "@medusajs/admin-sdk"
import SchemaDocsView from "./schema-docs-view"

const SchemaAllPage = () => {
  return <SchemaDocsView titleZh="数据库表定义（全部）" titleEn="Database Schema (All)" />
}

export const config = defineRouteConfig({
  label: "数据库结构",
  rank: 200,
})

export default SchemaAllPage
