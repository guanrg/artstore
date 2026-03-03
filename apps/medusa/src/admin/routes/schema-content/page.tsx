import { defineRouteConfig } from "@medusajs/admin-sdk"
import SchemaDocsView from "../schema-docs/schema-docs-view"

const SchemaContentPage = () => {
  return <SchemaDocsView title="数据库表定义（内容管理）" category="content" />
}

export const config = defineRouteConfig({
  rank: 205,
})

export default SchemaContentPage
