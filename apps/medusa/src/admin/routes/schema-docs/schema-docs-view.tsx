import { Fragment, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react"

type SchemaRow = {
  table_schema: string
  table_name: string
  table_comment: string
  ordinal_position: number | string
  column_name: string
  data_type: string
  udt_name: string
  is_nullable: string
  column_default: string
  column_comment: string
}

type SchemaResponse = {
  generated_at: string
  table_count: number
  column_count: number
  rows: SchemaRow[]
}

export type TableCategory = "user" | "catalog" | "trade" | "pricing" | "content" | "other"

type SchemaDocsViewProps = {
  title: string
  category?: TableCategory
}

const categoryNav = [
  { path: "/app/schema-docs", label: "全部" },
  { path: "/app/schema-users", label: "用户管理" },
  { path: "/app/schema-catalog", label: "商品库存" },
  { path: "/app/schema-trade", label: "交易履约" },
  { path: "/app/schema-pricing", label: "区域税费" },
  { path: "/app/schema-content", label: "内容管理" },
  { path: "/app/schema-other", label: "其他" },
]

function getTableAnchorId(schema: string, table: string): string {
  return `table-${schema}-${table}`.replace(/[^a-zA-Z0-9_-]/g, "-")
}

function inferCategory(tableName: string): TableCategory {
  const name = tableName.toLowerCase()

  const catalogRules = [
    /^product\b/,
    /_product_/,
    /product_/,
    /product_type/,
    /product_tag/,
    /product_category/,
    /product_collection/,
    /product_variant/,
    /product_option/,
    /variant/,
    /inventory/,
    /inventory_item/,
    /inventory_level/,
    /stock/,
    /stock_location/,
    /collection/,
    /category/,
    /tag/,
    /image/,
    /sales_channel/,
    /shipping_profile/,
    /^location\b/,
    /shipping_option_type/,
  ]
  if (catalogRules.some((rule) => rule.test(name))) {
    return "catalog"
  }

  const userRules = [/^user\b/, /^customer\b/, /auth_identity/, /provider_identity/, /invite/, /permission/, /profile/]
  if (userRules.some((rule) => rule.test(name))) {
    return "user"
  }

  const tradeRules = [/^cart\b/, /^order\b/, /payment/, /fulfillment/, /shipment/, /return/, /refund/, /reservation/, /claim/, /swap/]
  if (tradeRules.some((rule) => rule.test(name))) {
    return "trade"
  }

  const pricingRules = [/^region\b/, /^currency\b/, /^tax\b/, /price/, /promotion/, /discount/, /money/, /^store\b/]
  if (pricingRules.some((rule) => rule.test(name))) {
    return "pricing"
  }

  const contentRules = [/strapi/, /^article\b/, /content/, /upload/, /file/, /component/, /i18n/]
  if (contentRules.some((rule) => rule.test(name))) {
    return "content"
  }

  return "other"
}

const cardStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 12,
  background: "#fff",
}

const inputStyle: CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 13,
}

const SchemaDocsView = ({ title, category }: SchemaDocsViewProps) => {
  const [rows, setRows] = useState<SchemaRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [generatedAt, setGeneratedAt] = useState("")
  const [tableCount, setTableCount] = useState(0)
  const [columnCount, setColumnCount] = useState(0)
  const [tableKeyword, setTableKeyword] = useState("")
  const [columnKeyword, setColumnKeyword] = useState("")
  const [schema, setSchema] = useState("")

  const loadSchema = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const requestSchema = async (url: string) =>
        fetch(url, {
          method: "GET",
          credentials: "include",
        })

      let response = await requestSchema("/admin/schema")
      if (response.status === 401 || response.status === 403) {
        response = await requestSchema("/store/schema")
      }

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Request failed (${response.status})`)
      }

      const data = (await response.json()) as SchemaResponse
      setRows(Array.isArray(data.rows) ? data.rows : [])
      setGeneratedAt(data.generated_at || "")
      setTableCount(data.table_count || 0)
      setColumnCount(data.column_count || 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSchema()
  }, [loadSchema])

  const schemas = useMemo(
    () => Array.from(new Set(rows.map((r) => r.table_schema))).sort(),
    [rows]
  )

  const filteredRows = useMemo(() => {
    const t = tableKeyword.trim().toLowerCase()
    const c = columnKeyword.trim().toLowerCase()

    return rows.filter((row) => {
      if (schema && row.table_schema !== schema) {
        return false
      }
      if (category && inferCategory(row.table_name) !== category) {
        return false
      }

      const hitTable = !t || row.table_name.toLowerCase().includes(t)
      const hitColumn =
        !c ||
        row.column_name.toLowerCase().includes(c) ||
        (row.column_comment || "").toLowerCase().includes(c)

      return hitTable && hitColumn
    })
  }, [rows, schema, tableKeyword, columnKeyword, category])

  const visibleTableCount = useMemo(
    () => new Set(filteredRows.map((r) => `${r.table_schema}.${r.table_name}`)).size,
    [filteredRows]
  )

  const tableGroups = useMemo(() => {
    const seen = new Set<string>()
    const groups: Array<{ schema: string; table: string; label: string }> = []
    for (const row of filteredRows) {
      const key = `${row.table_schema}.${row.table_name}`
      if (seen.has(key)) {
        continue
      }
      seen.add(key)
      groups.push({
        schema: row.table_schema,
        table: row.table_name,
        label: row.table_name,
      })
    }
    return groups
  }, [filteredRows])

  let currentGroup = ""

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <div style={cardStyle}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 18 }}>{title}</h2>
        <div style={{ fontSize: 13, color: "#4b5563", marginBottom: 10 }}>
          点击“刷新”即可一键更新当前数据库结构说明。
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => void loadSchema()}
            disabled={loading}
            style={{
              border: "1px solid #1d4ed8",
              background: "#1d4ed8",
              color: "#fff",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            {loading ? "更新中..." : "刷新（更新说明）"}
          </button>
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            当前页表: {visibleTableCount} | 总表: {tableCount} | 总字段: {columnCount}
            {generatedAt ? ` | 生成时间: ${new Date(generatedAt).toLocaleString()}` : ""}
          </span>
        </div>
        {error ? (
          <div style={{ marginTop: 10, color: "#b91c1c", fontSize: 13 }}>
            加载失败: {error}
          </div>
        ) : null}
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", fontSize: 13, color: "#334155" }}>
            分类导航（点击展开）
          </summary>
          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {categoryNav.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  window.location.assign(item.path)
                }}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "4px 10px",
                  fontSize: 12,
                  background: window.location.pathname === item.path ? "#dbeafe" : "#f8fafc",
                  color: "#0f172a",
                  cursor: "pointer",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </details>
        <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tableGroups.map((group) => (
            <button
              key={`${group.schema}.${group.table}`}
              type="button"
              onClick={() => {
                const id = getTableAnchorId(group.schema, group.table)
                const node = document.getElementById(id)
                node?.scrollIntoView({ behavior: "smooth", block: "start" })
              }}
              style={{
                border: "1px solid #93c5fd",
                borderRadius: 999,
                padding: "4px 10px",
                fontSize: 12,
                background: "#eff6ff",
                color: "#1e3a8a",
                cursor: "pointer",
              }}
            >
              {group.label}
            </button>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            style={inputStyle}
            placeholder="筛选表名"
            value={tableKeyword}
            onChange={(e) => setTableKeyword(e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="筛选字段名/字段注释"
            value={columnKeyword}
            onChange={(e) => setColumnKeyword(e.target.value)}
          />
          <select
            style={inputStyle}
            value={schema}
            onChange={(e) => setSchema(e.target.value)}
          >
            <option value="">全部 Schema</option>
            {schemas.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ ...cardStyle, overflow: "auto", padding: 0 }}>
        <table style={{ borderCollapse: "collapse", minWidth: 1100, width: "100%" }}>
          <thead>
            <tr>
              {["#", "Column", "Data Type", "UDT", "Nullable", "Default", "Column Comment"].map((title) => (
                <th
                  key={title}
                  style={{
                    borderBottom: "1px solid #e5e7eb",
                    borderRight: "1px solid #eef2f7",
                    textAlign: "left",
                    padding: 8,
                    position: "sticky",
                    top: 0,
                    background: "#f9fafb",
                    fontSize: 12,
                  }}
                >
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, rowIndex) => {
              const group = `${row.table_schema}.${row.table_name}`
              const showGroup = group !== currentGroup
              currentGroup = group
              const rowBg = rowIndex % 2 === 0 ? "#ffffff" : "#e7f0ff"

              return (
                <Fragment key={`${group}.${row.column_name}.${row.ordinal_position}`}>
                  {showGroup ? (
                    <tr>
                      <td
                        id={getTableAnchorId(row.table_schema, row.table_name)}
                        colSpan={7}
                        style={{
                          background: "#cfe0ff",
                          borderBottom: "1px solid #9db8f5",
                          padding: "7px 8px",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {group}
                        {row.table_comment ? ` | ${row.table_comment}` : ""}
                      </td>
                    </tr>
                  ) : null}
                  <tr>
                    <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8, fontSize: 12, background: rowBg }}>
                      {row.ordinal_position}
                    </td>
                    <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8, fontSize: 12, background: rowBg }}>
                      {row.column_name}
                    </td>
                    <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8, fontSize: 12, background: rowBg }}>
                      {row.data_type}
                    </td>
                    <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8, fontSize: 12, background: rowBg }}>
                      {row.udt_name}
                    </td>
                    <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8, fontSize: 12, background: rowBg }}>
                      {row.is_nullable}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        padding: 8,
                        fontSize: 12,
                        maxWidth: 220,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        background: rowBg,
                      }}
                    >
                      {row.column_default}
                    </td>
                    <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8, fontSize: 12, background: rowBg }}>
                      {row.column_comment}
                    </td>
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default SchemaDocsView
