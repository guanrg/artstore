import { defineRouteConfig } from "@medusajs/admin-sdk"
import SchemaDocsView from "../schema-docs/schema-docs-view"

const SchemaUsersPage = () => {
  return <SchemaDocsView titleZh="数据库表定义（用户管理）" titleEn="Database Schema (Users)" category="user" />
}

export const config = defineRouteConfig({
  rank: 201,
})

export default SchemaUsersPage
