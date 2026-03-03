import { defineRouteConfig } from "@medusajs/admin-sdk"
import SchemaDocsView from "../schema-docs/schema-docs-view"

const SchemaTradePage = () => {
  return <SchemaDocsView title="数据库表定义（交易与履约）" category="trade" />
}

export const config = defineRouteConfig({
  rank: 203,
})

export default SchemaTradePage
