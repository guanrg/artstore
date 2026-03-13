import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useMemo, useState, type CSSProperties } from "react"
import FilterToolbar, {
  ToolbarToggleGroup,
  toolbarInputStyle,
} from "../reports/components/filter-toolbar"
import { useAdminLanguage } from "../../lib/admin-language"
import { adminCardStyle, adminTheme } from "../../lib/admin-theme"
import ReportActionBar from "../reports/components/report-action-bar"
import ReportEmptyState from "../reports/components/report-empty-state"
import ReportHeader from "../reports/components/report-header"
import { useReportNotice } from "../reports/components/use-report-notice"

type ProductRow = {
  title: string
  quantity: number
  sales: number
  orders: number
}

type Response = {
  range: {
    start: string
    end: string
    days: number
  }
  products: ProductRow[]
}

type ProductColumn = "quantity" | "orders" | "sales"

const shellStyle: CSSProperties = {
  padding: 16,
  display: "grid",
  gap: 16,
  background: `linear-gradient(180deg, ${adminTheme.color.canvas} 0%, ${adminTheme.color.canvasAlt} 100%)`,
}

const panelStyle: CSSProperties = {
  ...adminCardStyle,
  borderRadius: 16,
  padding: 16,
}

const truncatedCellStyle: CSSProperties = {
  maxWidth: 320,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}

const emptyStateStyle: CSSProperties = {
  padding: "32px 12px",
  textAlign: "center",
  color: adminTheme.color.textMuted,
  fontSize: 14,
}

const sortableHeaderStyle: CSSProperties = {
  cursor: "pointer",
  userSelect: "none",
  transition: "color 140ms ease",
}

const metaTextStyle: CSSProperties = { color: adminTheme.color.text }
const subtleTextStyle: CSSProperties = { color: adminTheme.color.textMuted }
const errorBannerStyle: CSSProperties = {
  marginBottom: 12,
  padding: 12,
  borderRadius: 12,
  border: `1px solid ${adminTheme.color.danger}`,
  background: adminTheme.color.dangerSoft,
  color: adminTheme.color.danger,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
}
const tableHeaderBaseStyle: CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  color: adminTheme.color.textMuted,
  padding: "10px 8px",
  borderBottom: `1px solid ${adminTheme.color.border}`,
  background: adminTheme.color.surfaceMuted,
}
const tableCellStyle: CSSProperties = {
  padding: "10px 8px",
  borderBottom: `1px solid ${adminTheme.color.border}`,
  color: adminTheme.color.text,
}
const tableLinkStyle: CSSProperties = {
  color: adminTheme.color.primary,
  textDecoration: "none",
  display: "inline-block",
}

const PRODUCT_COLUMNS_STORAGE_KEY = "artstore_report_products_columns"
const DEFAULT_PRODUCT_COLUMNS: ProductColumn[] = ["quantity", "orders", "sales"]

async function api<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: "include" })
  const data = (await response.json().catch(() => ({}))) as T & { message?: string }
  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`)
  }
  return data
}

function csvEscape(value: string | number) {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function slug(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase()
}

function rangeSlug(range?: Response["range"] | null) {
  if (!range) return "unknown-range"
  return `${range.start.slice(0, 10)}-to-${range.end.slice(0, 10)}`
}

function syncUrl(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams(window.location.search)

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      search.delete(key)
    } else {
      search.set(key, String(value))
    }
  }

  window.history.replaceState({}, "", `${window.location.pathname}?${search.toString()}`)
}

const ReportProductsPage = () => {
  const { t } = useAdminLanguage()
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdatedAt, setLastUpdatedAt] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<"sales" | "quantity" | "orders" | "title">("sales")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [columns, setColumns] = useState<ProductColumn[]>(DEFAULT_PRODUCT_COLUMNS)
  const pageSize = 25
  const { notice, showNotice } = useReportNotice()

  const exportHref = useMemo(() => {
    return `/admin/reports/export?${window.location.search.slice(1)}`
  }, [refreshKey])

  useEffect(() => {
    let active = true

    ;(async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams(window.location.search)
        setQuery(params.get("q") || "")
        const key = params.get("sort_key")
        const dir = params.get("sort_dir")
        const currentPage = Number(params.get("page") || "1")
        const rawColumns = params.get("columns") || ""
        const nextColumns =
          rawColumns === "none"
            ? []
            : rawColumns
                .split(",")
                .filter((value): value is ProductColumn => ["quantity", "orders", "sales"].includes(value))
        if (key === "sales" || key === "quantity" || key === "orders" || key === "title") {
          setSortKey(key)
        }
        if (dir === "asc" || dir === "desc") {
          setSortDir(dir)
        }
        if (Number.isFinite(currentPage) && currentPage > 0) {
          setPage(currentPage)
        }
        if (rawColumns) {
          setColumns(nextColumns)
        } else {
          try {
            const stored = window.localStorage.getItem(PRODUCT_COLUMNS_STORAGE_KEY)
            if (stored) {
              const parsed = JSON.parse(stored) as ProductColumn[]
              if (Array.isArray(parsed)) {
                setColumns(parsed)
              }
            }
          } catch {
            // Ignore malformed local storage values.
          }
        }
        const response = await api<Response>(`/admin/reports/products?${window.location.search.slice(1)}`)
        if (active) {
          setData(response)
          setLastUpdatedAt(new Date().toISOString())
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : t("商品报表加载失败", "Failed to load products"))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [refreshKey])

  const filteredProducts = useMemo(() => {
    const rows = data?.products ?? []
    const q = query.trim().toLowerCase()
    const next = (!q ? rows : rows.filter((row) => row.title.toLowerCase().includes(q))).slice()

    next.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      if (sortKey === "title") {
        return a.title.localeCompare(b.title) * dir
      }

      return (a[sortKey] - b[sortKey]) * dir
    })

    return next
  }, [data, query, sortKey, sortDir])

  const summary = useMemo(() => {
    const rows = filteredProducts
    return {
      count: rows.length,
      quantity: rows.reduce((sum, row) => sum + row.quantity, 0),
      sales: rows.reduce((sum, row) => sum + row.sales, 0),
    }
  }, [filteredProducts])

  const exportCurrentRows = () => {
    const lines = [
      "title,quantity,orders,sales",
      ...filteredProducts.map((row) =>
        [row.title, row.quantity, row.orders, row.sales].map(csvEscape).join(",")
      ),
    ]

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `report-products-${rangeSlug(data?.range)}-${sortKey}-${sortDir}-${slug(query || "all")}-page-${page}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    showNotice(t("CSV 已生成", "CSV prepared"), "success")
  }

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))

  const pagedProducts = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredProducts.slice(start, start + pageSize)
  }, [filteredProducts, page])

  useEffect(() => {
    setPage(1)
  }, [query, sortKey, sortDir])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    syncUrl({
      q: query.trim() || undefined,
      sort_key: sortKey,
      sort_dir: sortDir,
      page,
      columns: columns.length ? columns.join(",") : "none",
    })
  }, [query, sortKey, sortDir, page, columns])

  useEffect(() => {
    window.localStorage.setItem(PRODUCT_COLUMNS_STORAGE_KEY, JSON.stringify(columns))
  }, [columns])

  const toggleColumn = (column: ProductColumn) => {
    setColumns((current) =>
      current.includes(column) ? current.filter((item) => item !== column) : [...current, column]
    )
  }

  const resetColumns = () => {
    setColumns(DEFAULT_PRODUCT_COLUMNS)
  }

  const toggleSort = (key: "sales" | "quantity" | "orders" | "title") => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(key)
    setSortDir(key === "title" ? "asc" : "desc")
  }

  const sortLabel = (key: "sales" | "quantity" | "orders" | "title", label: string) =>
    `${label}${sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}`

  const clearFilters = () => {
    setQuery("")
    setSortKey("sales")
    setSortDir("desc")
    setPage(1)
  }

  const copyCurrentLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      showNotice(t("链接已复制", "Link copied"), "success")
    } catch {
      showNotice(t("复制失败", "Copy failed"), "error")
    }
  }

  const refreshReport = () => {
    setRefreshKey((value) => value + 1)
    showNotice(t("正在刷新...", "Refreshing..."), "info", 1200)
  }

  return (
    <div style={shellStyle}>
      <ReportHeader
        title={t("商品销售明细", "Product Sales Breakdown")}
        subtitle={
          data
            ? t(`${data.range.start.slice(0, 10)} 至 ${data.range.end.slice(0, 10)}`, `${data.range.start.slice(0, 10)} to ${data.range.end.slice(0, 10)}`)
            : t("正在加载时间范围...", "Loading range...")
        }
        crumbs={[
          { label: t("报表", "Reports"), href: "/app/reports" },
          { label: t("商品", "Products") },
        ]}
        aside={
          <div style={{ display: "flex", gap: 16, fontSize: 13, flexWrap: "wrap", ...metaTextStyle }}>
            <span>{t(`商品 ${summary.count}`, `Products ${summary.count}`)}</span>
            <span>{t(`销量 ${summary.quantity}`, `Units ${summary.quantity}`)}</span>
            <span>{t(`销售额 ${summary.sales.toLocaleString("en-US")}`, `Sales ${summary.sales.toLocaleString("en-US")}`)}</span>
          </div>
        }
      />

      <div style={panelStyle}>
        <FilterToolbar onClear={clearFilters} clearLabel={t("清空筛选", "Clear Filters")}>
          <input
            style={{ ...toolbarInputStyle, minWidth: 260 }}
            placeholder={t("搜索商品标题", "Search product title")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            style={toolbarInputStyle}
            value={sortKey}
            onChange={(event) =>
              setSortKey(event.target.value as "sales" | "quantity" | "orders" | "title")
            }
          >
            <option value="sales">{t("按销售额排序", "Sort by sales")}</option>
            <option value="quantity">{t("按销量排序", "Sort by units")}</option>
            <option value="orders">{t("按明细数排序", "Sort by line items")}</option>
            <option value="title">{t("按标题排序", "Sort by title")}</option>
          </select>
          <select
            style={toolbarInputStyle}
            value={sortDir}
            onChange={(event) => setSortDir(event.target.value as "asc" | "desc")}
          >
            <option value="desc">{t("降序", "Descending")}</option>
            <option value="asc">{t("升序", "Ascending")}</option>
          </select>
          <ReportActionBar
            actions={[
              { key: "export-summary", label: t("导出汇总 CSV", "Export Summary CSV"), href: exportHref },
              { key: "export-filtered", label: t("导出筛选结果 CSV", "Export Filtered CSV"), onClick: exportCurrentRows },
              { key: "copy-link", label: t("复制筛选链接", "Copy Filter Link"), onClick: copyCurrentLink },
              { key: "refresh", label: loading ? t("正在刷新...", "Refreshing...") : t("刷新", "Refresh"), onClick: refreshReport, disabled: loading },
            ]}
            status={
              notice
                ? {
                    message: notice.message,
                    tone: notice.tone,
                  }
                : null
            }
          />
        </FilterToolbar>
        <div style={{ marginBottom: 12, display: "flex", gap: 16, fontSize: 13, flexWrap: "wrap", ...metaTextStyle }}>
          {lastUpdatedAt ? (
            <span>
              {t("更新时间", "Updated")} {new Date(lastUpdatedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : null}
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
            <ToolbarToggleGroup
              label={t("显示列", "Visible columns")}
              options={[
                { key: "quantity", label: t("销量", "Units"), active: columns.includes("quantity"), onToggle: () => toggleColumn("quantity") },
                { key: "orders", label: t("明细数", "Line items"), active: columns.includes("orders"), onToggle: () => toggleColumn("orders") },
                { key: "sales", label: t("销售额", "Sales"), active: columns.includes("sales"), onToggle: () => toggleColumn("sales") },
              ]}
            />
            <button type="button" style={toolbarInputStyle} onClick={resetColumns}>
              {t("恢复默认列", "Reset Default Columns")}
            </button>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12, fontSize: 13, flexWrap: "wrap", ...subtleTextStyle }}>
          <span>
            {t("显示", "Showing")} {filteredProducts.length ? (page - 1) * pageSize + 1 : 0}
            {"-"}
            {Math.min(page * pageSize, filteredProducts.length)} {t("共", "of")} {filteredProducts.length}
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              style={toolbarInputStyle}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1}
            >
              {t("上一页", "Prev")}
            </button>
            <span>{t("页", "Page")} {page} / {totalPages}</span>
            <button
              type="button"
              style={toolbarInputStyle}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={page >= totalPages}
            >
              {t("下一页", "Next")}
            </button>
          </div>
        </div>
        {loading ? <div>{t("加载中...", "Loading...")}</div> : null}
        {error ? (
          <div style={errorBannerStyle}>
            <span>{error}</span>
            <button type="button" style={toolbarInputStyle} onClick={refreshReport} disabled={loading}>
              {loading ? t("正在刷新...", "Refreshing...") : t("重试", "Retry")}
            </button>
          </div>
        ) : null}
        {!loading && !error && !pagedProducts.length ? (
          <ReportEmptyState
            title={t("没有符合当前筛选条件的商品", "No products match the current filters")}
            body={t("可以尝试清空商品搜索、切换排序方式，或扩大日期范围。", "Try clearing the product search, switching sort focus, or expanding the date range so the report can include more product sales activity.")}
          />
        ) : null}
        {!loading && !error ? (
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr>
                  <th
                    onClick={() => toggleSort("title")}
                    title={t("按商品标题排序", "Sort by product title")}
                    style={{ ...tableHeaderBaseStyle, color: sortKey === "title" ? adminTheme.color.primary : adminTheme.color.textMuted, ...sortableHeaderStyle }}
                  >
                    {sortLabel("title", t("商品", "Product"))}
                  </th>
                  {columns.includes("quantity") ? (
                    <th
                      onClick={() => toggleSort("quantity")}
                      title={t("按销量排序", "Sort by units sold")}
                      style={{ ...tableHeaderBaseStyle, color: sortKey === "quantity" ? adminTheme.color.primary : adminTheme.color.textMuted, ...sortableHeaderStyle }}
                    >
                      {sortLabel("quantity", t("销量", "Units Sold"))}
                    </th>
                  ) : null}
                  {columns.includes("orders") ? (
                    <th
                      onClick={() => toggleSort("orders")}
                      title={t("按明细数排序", "Sort by line item count")}
                      style={{ ...tableHeaderBaseStyle, color: sortKey === "orders" ? adminTheme.color.primary : adminTheme.color.textMuted, ...sortableHeaderStyle }}
                    >
                      {sortLabel("orders", t("明细数", "Line Items"))}
                    </th>
                  ) : null}
                  {columns.includes("sales") ? (
                    <th
                      onClick={() => toggleSort("sales")}
                      title={t("按销售额排序", "Sort by sales")}
                      style={{ ...tableHeaderBaseStyle, color: sortKey === "sales" ? adminTheme.color.primary : adminTheme.color.textMuted, ...sortableHeaderStyle }}
                    >
                      {sortLabel("sales", t("销售额", "Sales"))}
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {pagedProducts.map((row) => (
                  <tr key={row.title}>
                    <td style={tableCellStyle}>
                      <a
                        href={`/app/products?q=${encodeURIComponent(row.title)}`}
                        style={{ ...tableLinkStyle, ...truncatedCellStyle }}
                      >
                        {row.title}
                      </a>
                    </td>
                    {columns.includes("quantity") ? (
                      <td style={tableCellStyle}>{row.quantity}</td>
                    ) : null}
                    {columns.includes("orders") ? (
                      <td style={tableCellStyle}>{row.orders}</td>
                    ) : null}
                    {columns.includes("sales") ? (
                      <td style={tableCellStyle}>
                        {row.sales.toLocaleString("en-US")}
                      </td>
                    ) : null}
                  </tr>
                ))}
                {!pagedProducts.length ? (
                  <tr>
                    <td
                      colSpan={1 + (columns.includes("quantity") ? 1 : 0) + (columns.includes("orders") ? 1 : 0) + (columns.includes("sales") ? 1 : 0)}
                      style={emptyStateStyle}
                    >
                      {t("没有符合当前筛选条件的商品。请尝试清空搜索或调整日期范围。", "No products matched the current filters. Try clearing the search or adjusting the date range.")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "商品报表",
  rank: 92,
})

export default ReportProductsPage
