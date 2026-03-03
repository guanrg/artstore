import { defineRouteConfig } from "@medusajs/admin-sdk"
import SchemaDocsView from "../schema-docs/schema-docs-view"

const SchemaCatalogPage = () => {
  return <SchemaDocsView title="数据库表定义（商品与库存）" category="catalog" />
}

export const config = defineRouteConfig({
  rank: 202,
})

export default SchemaCatalogPage
