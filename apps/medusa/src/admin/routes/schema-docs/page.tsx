import { defineRouteConfig } from "@medusajs/admin-sdk"
import SchemaDocsView from "./schema-docs-view"

const SchemaAllPage = () => {
  return <SchemaDocsView title="数据库表定义（全部）" />
}

export const config = defineRouteConfig({
  label: "库表",
  rank: 200,
})

export default SchemaAllPage
