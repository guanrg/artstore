import { defineRouteConfig } from "@medusajs/admin-sdk"
import SchemaDocsView from "../schema-docs/schema-docs-view"

const SchemaOtherPage = () => {
  return <SchemaDocsView title="数据库表定义（其他）" category="other" />
}

export const config = defineRouteConfig({
  rank: 206,
})

export default SchemaOtherPage
