import { Fragment, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react"
import AdminLanguageDock from "../../components/admin-language-dock"
import { useAdminLanguage } from "../../lib/admin-language"
import { adminCardStyle, adminTheme } from "../../lib/admin-theme"
import ReportHeader from "../reports/components/report-header"

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

export type TableCategory =
  | "user"
  | "catalog"
  | "trade"
  | "pricing"
  | "content"
  | "crm"
  | "other"

type SchemaDocsViewProps = {
  titleZh: string
  titleEn?: string
  category?: TableCategory
}

const categoryNav = [
  { path: "/app/schema-docs", labelZh: "全部", labelEn: "All" },
  { path: "/app/schema-users", labelZh: "用户管理", labelEn: "Users" },
  { path: "/app/schema-catalog", labelZh: "商品库存", labelEn: "Catalog" },
  { path: "/app/schema-trade", labelZh: "交易履约", labelEn: "Trade" },
  { path: "/app/schema-pricing", labelZh: "区域税费", labelEn: "Pricing" },
  { path: "/app/schema-content", labelZh: "内容管理", labelEn: "Content" },
  { path: "/app/schema-crm", labelZh: "CRM", labelEn: "CRM" },
  { path: "/app/schema-other", labelZh: "其他", labelEn: "Other" },
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

  const crmRules = [
    /^crm_/,
    /\bcrm\b/,
    /^lead\b/,
    /^opportunity\b/,
    /^task\b/,
    /task_relation/,
  ]
  if (crmRules.some((rule) => rule.test(name))) {
    return "crm"
  }

  return "other"
}

const cardStyle: CSSProperties = {
  ...adminCardStyle,
  borderRadius: 14,
  padding: 12,
}

const inputStyle: CSSProperties = {
  border: `1px solid ${adminTheme.color.border}`,
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 13,
  background: adminTheme.color.surface,
  color: adminTheme.color.text,
  boxShadow: adminTheme.shadow.soft,
}

const directoryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
}

const directoryCardStyle: CSSProperties = {
  border: `1px solid ${adminTheme.color.border}`,
  borderRadius: 14,
  padding: 14,
  background: `linear-gradient(180deg, ${adminTheme.color.surface} 0%, ${adminTheme.color.surfaceMuted} 100%)`,
  display: "grid",
  gap: 8,
  boxShadow: adminTheme.shadow.soft,
  transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
}

function SchemaMark(props: { label: string; active?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 30,
        height: 30,
        padding: "0 8px",
        borderRadius: 999,
        background: props.active ? adminTheme.color.accentSoft : adminTheme.color.primarySoft,
        color: props.active ? adminTheme.color.accent : adminTheme.color.primary,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.04em",
      }}
    >
      {props.label}
    </span>
  )
}

function SchemaCategoryCard(props: {
  title: string
  description: string
  href: string
  active?: boolean
  statusLabel: string
  openLabel: string
  icon: string
}) {
  return (
    <a
      href={props.href}
      onMouseEnter={(event) => {
        const node = event.currentTarget
        node.style.transform = "translateY(-2px)"
        node.style.boxShadow = adminTheme.shadow.focus
        node.style.borderColor = adminTheme.color.primary
      }}
      onMouseLeave={(event) => {
        const node = event.currentTarget
        node.style.transform = ""
        node.style.boxShadow = props.active ? adminTheme.shadow.focus : adminTheme.shadow.soft
        node.style.borderColor = props.active ? adminTheme.color.primary : adminTheme.color.border
      }}
      onFocus={(event) => {
        const node = event.currentTarget
        node.style.transform = "translateY(-2px)"
        node.style.boxShadow = adminTheme.shadow.focus
        node.style.borderColor = adminTheme.color.primary
      }}
      onBlur={(event) => {
        const node = event.currentTarget
        node.style.transform = ""
        node.style.boxShadow = props.active ? adminTheme.shadow.focus : adminTheme.shadow.soft
        node.style.borderColor = props.active ? adminTheme.color.primary : adminTheme.color.border
      }}
      style={{
        ...directoryCardStyle,
        textDecoration: "none",
        color: adminTheme.color.text,
        borderColor: props.active ? adminTheme.color.primary : adminTheme.color.border,
        boxShadow: props.active ? adminTheme.shadow.focus : adminTheme.shadow.soft,
      }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}
      >
        <div
          style={{
            width: 38,
            height: 4,
            borderRadius: 999,
            background: props.active
              ? `linear-gradient(90deg, ${adminTheme.color.primary} 0%, ${adminTheme.color.accent} 100%)`
              : adminTheme.color.borderStrong,
          }}
        />
        <SchemaMark label={props.icon} active={props.active} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{props.title}</div>
      <div style={{ fontSize: 12, color: adminTheme.color.textMuted, lineHeight: 1.6 }}>{props.description}</div>
      <div style={{ fontSize: 12, color: adminTheme.color.primary, fontWeight: 700 }}>
        {props.active ? props.statusLabel : props.openLabel}
      </div>
    </a>
  )
}

const SchemaDocsView = ({ titleZh, titleEn, category }: SchemaDocsViewProps) => {
  const { t } = useAdminLanguage()
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
        throw new Error(text || t(`请求失败（${response.status}）`, `Request failed (${response.status})`))
      }

      const data = (await response.json()) as SchemaResponse
      setRows(Array.isArray(data.rows) ? data.rows : [])
      setGeneratedAt(data.generated_at || "")
      setTableCount(data.table_count || 0)
      setColumnCount(data.column_count || 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("加载失败", "Load failed"))
    } finally {
      setLoading(false)
    }
  }, [language])

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

  const categoryCards = useMemo(
    () =>
      categoryNav.map((item) => ({
        ...item,
        icon:
          {
            "/app/schema-docs": "ALL",
            "/app/schema-users": "USR",
            "/app/schema-catalog": "CAT",
            "/app/schema-trade": "TRD",
            "/app/schema-pricing": "PRC",
            "/app/schema-content": "CMS",
            "/app/schema-crm": "CRM",
            "/app/schema-other": "ETC",
          }[item.path] ?? "DB",
        description: t(
          {
            "/app/schema-docs": "浏览全部库表定义，适合全局检索和跨模块排查。",
            "/app/schema-users": "查看用户、客户、权限与身份相关表结构。",
            "/app/schema-catalog": "查看商品、变体、库存和分类相关表结构。",
            "/app/schema-trade": "查看订单、购物车、退款、履约与退换货相关表结构。",
            "/app/schema-pricing": "查看价格、税区、币种、促销和门店相关表结构。",
            "/app/schema-content": "查看内容、上传、Strapi 与 i18n 相关表结构。",
            "/app/schema-crm": "查看线索、商机、任务与 CRM 关系表结构。",
            "/app/schema-other": "查看不属于以上分类的其他系统表结构。",
          }[item.path] ?? "查看当前分类。",
          {
            "/app/schema-docs": "Browse all tables for global lookup and cross-module troubleshooting.",
            "/app/schema-users": "Inspect user, customer, permission, and identity-related tables.",
            "/app/schema-catalog": "Inspect products, variants, inventory, and category-related tables.",
            "/app/schema-trade": "Inspect orders, carts, refunds, fulfillment, and return-related tables.",
            "/app/schema-pricing": "Inspect pricing, tax, currency, promotion, and store-related tables.",
            "/app/schema-content": "Inspect content, upload, Strapi, and i18n-related tables.",
            "/app/schema-crm": "Inspect leads, opportunities, tasks, and CRM relation tables.",
            "/app/schema-other": "Inspect uncategorized system tables outside the main domains.",
          }[item.path] ?? "Open this category."
        ),
      })),
    [t]
  )

  let currentGroup = ""

  return (
    <div
      style={{
        padding: 16,
        display: "grid",
        gap: 12,
        background: `radial-gradient(circle at top left, ${adminTheme.color.highlight} 0%, transparent 24%), linear-gradient(180deg, ${adminTheme.color.canvas} 0%, ${adminTheme.color.canvasAlt} 100%)`,
      }}
    >
      <div style={cardStyle}>
        <ReportHeader
          title={t(titleZh, titleEn ?? titleZh)}
          crumbs={[
            { label: t("库表 Schema", "Schema") },
          ]}
          aside={
            <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <SchemaMark label="DB" active />
                <span style={{ fontSize: 12, color: adminTheme.color.textMuted }}>
                  {t("当前页表", "Visible tables")}: {visibleTableCount} | {t("总表", "Total tables")}: {tableCount} | {t("总字段", "Total columns")}: {columnCount}
                </span>
              </div>
            </div>
          }
        />
        <div style={{ fontSize: 13, color: adminTheme.color.textMuted, marginTop: 10, marginBottom: 10 }}>
          {t("点击“刷新”即可一键更新当前数据库结构说明。", "Use Refresh to reload the current database schema reference.")}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => void loadSchema()}
            disabled={loading}
            style={{
              border: `1px solid ${adminTheme.color.primary}`,
              background: adminTheme.color.primary,
              color: adminTheme.color.primaryText,
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
              boxShadow: adminTheme.shadow.soft,
            }}
          >
            {loading ? t("更新中...", "Refreshing...") : t("刷新（更新说明）", "Refresh schema")}
          </button>
          <span style={{ fontSize: 12, color: adminTheme.color.textMuted }}>
            {generatedAt ? `${t("生成时间", "Generated")}: ${new Date(generatedAt).toLocaleString()}` : ""}
          </span>
          <a
            href="/admin/custom/er-crm.html"
            target="_blank"
            rel="noreferrer"
            style={{
              border: `1px solid ${adminTheme.color.primary}`,
              background: adminTheme.color.primarySoft,
              color: adminTheme.color.primary,
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("打开 CRM ER 图（HTML）", "Open CRM ER (HTML)")}
          </a>
          <a
            href="/admin/custom/er-all.html"
            target="_blank"
            rel="noreferrer"
            style={{
              border: `1px solid ${adminTheme.color.success}`,
              background: adminTheme.color.successSoft,
              color: adminTheme.color.success,
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("打开全库 ER 图（HTML）", "Open Full ER (HTML)")}
          </a>
        </div>
        {error ? (
          <div style={{ marginTop: 10, color: adminTheme.color.danger, fontSize: 13 }}>
            {t("加载失败", "Load failed")}: {error}
          </div>
        ) : null}
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: adminTheme.color.text }}>
            {t("库表分类卡片", "Schema category cards")}
          </div>
          <div style={directoryGridStyle}>
            {categoryCards.map((item) => (
              <SchemaCategoryCard
                key={item.path}
                icon={item.icon}
                title={t(item.labelZh, item.labelEn)}
                description={item.description}
                href={item.path}
                active={window.location.pathname === item.path}
                statusLabel={t("当前分类", "Current")}
                openLabel={t("打开分类", "Open")}
              />
            ))}
          </div>
        </div>
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
                border: `1px solid ${adminTheme.color.border}`,
                borderRadius: 999,
                padding: "4px 10px",
                fontSize: 12,
                background: adminTheme.color.primarySoft,
                color: adminTheme.color.primary,
                cursor: "pointer",
                boxShadow: adminTheme.shadow.soft,
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
            placeholder={t("筛选表名", "Filter table name")}
            value={tableKeyword}
            onChange={(e) => setTableKeyword(e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder={t("筛选字段名/字段注释", "Filter column / comment")}
            value={columnKeyword}
            onChange={(e) => setColumnKeyword(e.target.value)}
          />
          <select
            style={inputStyle}
            value={schema}
            onChange={(e) => setSchema(e.target.value)}
          >
            <option value="">{t("全部 Schema", "All schema")}</option>
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
              {[
                t("#", "#"),
                t("字段", "Column"),
                t("数据类型", "Data Type"),
                "UDT",
                t("可空", "Nullable"),
                t("默认值", "Default"),
                t("字段注释", "Column Comment"),
              ].map((title) => (
                <th
                  key={title}
                  style={{
                    borderBottom: "1px solid #e5e7eb",
                    borderRight: "1px solid #eef2f7",
                    textAlign: "left",
                    padding: 8,
                    position: "sticky",
                    top: 0,
                    background: adminTheme.color.surfaceMuted,
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
              const rowBg = rowIndex % 2 === 0 ? adminTheme.color.surface : adminTheme.color.surfaceMuted

              return (
                <Fragment key={`${group}.${row.column_name}.${row.ordinal_position}`}>
                  {showGroup ? (
                    <tr>
                      <td
                        id={getTableAnchorId(row.table_schema, row.table_name)}
                        colSpan={7}
                        style={{
                          background: adminTheme.color.primarySoft,
                          borderBottom: `1px solid ${adminTheme.color.borderStrong}`,
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
                    <td style={{ borderBottom: `1px solid ${adminTheme.color.border}`, padding: 8, fontSize: 12, background: rowBg }}>
                      {row.ordinal_position}
                    </td>
                    <td style={{ borderBottom: `1px solid ${adminTheme.color.border}`, padding: 8, fontSize: 12, background: rowBg }}>
                      {row.column_name}
                    </td>
                    <td style={{ borderBottom: `1px solid ${adminTheme.color.border}`, padding: 8, fontSize: 12, background: rowBg }}>
                      {row.data_type}
                    </td>
                    <td style={{ borderBottom: `1px solid ${adminTheme.color.border}`, padding: 8, fontSize: 12, background: rowBg }}>
                      {row.udt_name}
                    </td>
                    <td style={{ borderBottom: `1px solid ${adminTheme.color.border}`, padding: 8, fontSize: 12, background: rowBg }}>
                      {row.is_nullable}
                    </td>
                    <td
                      style={{
                        borderBottom: `1px solid ${adminTheme.color.border}`,
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
                    <td style={{ borderBottom: `1px solid ${adminTheme.color.border}`, padding: 8, fontSize: 12, background: rowBg }}>
                      {row.column_comment}
                    </td>
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <AdminLanguageDock />
    </div>
  )
}

export default SchemaDocsView
