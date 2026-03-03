import { defineRouteConfig } from "@medusajs/admin-sdk"
import SchemaDocsView from "../schema-docs/schema-docs-view"

const SchemaUsersPage = () => {
  return <SchemaDocsView title="数据库表定义（用户管理）" category="user" />
}

export const config = defineRouteConfig({
  rank: 201,
})

export default SchemaUsersPage
