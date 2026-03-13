import { defineRouteConfig } from "@medusajs/admin-sdk"
import SchemaDocsView from "../schema-docs/schema-docs-view"

const SchemaCatalogPage = () => {
  return <SchemaDocsView titleZh="数据库表定义（商品与库存）" titleEn="Database Schema (Catalog)" category="catalog" />
}

export const config = defineRouteConfig({
  rank: 202,
})

export default SchemaCatalogPage
