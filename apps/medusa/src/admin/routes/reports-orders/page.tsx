import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useMemo, useState, type CSSProperties } from "react"
import FilterToolbar, {
  ToolbarToggleGroup,
  toolbarInputStyle,
} from "../reports/components/filter-toolbar"
import { useAdminLanguage } from "../../lib/admin-language"
import { adminCardStyle, adminTheme } from "../../lib/admin-theme"
import ReportActionBar from "../reports/components/report-action-bar"
import ReportBadge from "../reports/components/report-badge"
import ReportEmptyState from "../reports/components/report-empty-state"
import ReportHeader from "../reports/components/report-header"
import ReportSummaryStrip from "../reports/components/report-summary-strip"
import { useReportNotice } from "../reports/components/use-report-notice"

type OrderRow = {
  id: string
  created_at: string
  status: string
  customer_id: string | null
  currency_code: string
  total: number
  refunded_total: number
  is_canceled: boolean
  refund_state: "none" | "partial" | "full"
  item_count: number
}

type Response = {
  range: {
    start: string
    end: string
    days: number
  }
  status: "" | "active" | "canceled" | "refunded"
  orders: OrderRow[]
}

type OrderColumn = "status" | "refund" | "customer" | "items" | "refunded"

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
  maxWidth: 220,
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

const metaTextStyle: CSSProperties = {
  color: adminTheme.color.text,
}

const subtleTextStyle: CSSProperties = {
  color: adminTheme.color.textMuted,
}

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

const ORDER_COLUMNS_STORAGE_KEY = "artstore_report_orders_columns"
const DEFAULT_ORDER_COLUMNS: OrderColumn[] = ["status", "refund", "customer", "items", "refunded"]

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount)
}

async function api<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: "include" })
  const data = (await response.json().catch(() => ({}))) as T & { message?: string }
  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`)
  }
  return data
}

function csvEscape(value: string | number | boolean | null) {
  const text = String(value ?? "")
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function slug(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase()
}

function orderStatusBadge(status: string, isCanceled: boolean, t: (zh: string, en: string) => string) {
  if (isCanceled) {
    return <ReportBadge tone="danger">{t("已取消", "Canceled")}</ReportBadge>
  }

  const normalized = status.toLowerCase()

  if (normalized.includes("complete") || normalized.includes("paid") || normalized.includes("fulfilled")) {
    return <ReportBadge tone="success">{status}</ReportBadge>
  }

  if (normalized.includes("pending") || normalized.includes("await")) {
    return <ReportBadge tone="warning">{status}</ReportBadge>
  }

  return <ReportBadge tone="info">{status}</ReportBadge>
}

function refundStateBadge(state: OrderRow["refund_state"], t: (zh: string, en: string) => string) {
  if (state === "full") {
    return <ReportBadge tone="danger">{t("全额退款", "Full refund")}</ReportBadge>
  }
  if (state === "partial") {
    return <ReportBadge tone="warning">{t("部分退款", "Partial refund")}</ReportBadge>
  }
  return <ReportBadge tone="neutral">{t("无退款", "No refund")}</ReportBadge>
}

function rangeSlug(range?: Response["range"] | null) {
  if (!range) return "unknown-range"
  return `${range.start.slice(0, 10)}-to-${range.end.slice(0, 10)}`
}

function queryFromLocation() {
  const params = new URLSearchParams(window.location.search)
  return params.toString()
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

  const next = `${window.location.pathname}?${search.toString()}`
  window.history.replaceState({}, "", next)
}

const ReportOrdersPage = () => {
  const { t } = useAdminLanguage()
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdatedAt, setLastUpdatedAt] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "canceled">("")
  const [refundFilter, setRefundFilter] = useState<"" | OrderRow["refund_state"]>("")
  const [sortKey, setSortKey] = useState<"created_at" | "total" | "refunded_total">("created_at")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [columns, setColumns] = useState<OrderColumn[]>(DEFAULT_ORDER_COLUMNS)
  const pageSize = 25
  const { notice, showNotice } = useReportNotice()

  useEffect(() => {
    let active = true

    ;(async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams(window.location.search)
        setQuery(params.get("q") || "")
        const status = params.get("view_status")
        const refund = params.get("refund_state")
        const key = params.get("sort_key")
        const dir = params.get("sort_dir")
        const currentPage = Number(params.get("page") || "1")
        const rawColumns = params.get("columns") || ""
        const nextColumns =
          rawColumns === "none"
            ? []
            : rawColumns
                .split(",")
                .filter((value): value is OrderColumn =>
                  ["status", "refund", "customer", "items", "refunded"].includes(value)
                )

        if (status === "active" || status === "canceled") {
          setStatusFilter(status)
        }
        if (refund === "none" || refund === "partial" || refund === "full") {
          setRefundFilter(refund)
        }
        if (key === "created_at" || key === "total" || key === "refunded_total") {
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
            const stored = window.localStorage.getItem(ORDER_COLUMNS_STORAGE_KEY)
            if (stored) {
              const parsed = JSON.parse(stored) as OrderColumn[]
              if (Array.isArray(parsed)) {
                setColumns(parsed)
              }
            }
          } catch {
            // Ignore malformed local storage values.
          }
        }

        const response = await api<Response>(`/admin/reports/orders?${queryFromLocation()}`)
        if (active) {
          setData(response)
          setLastUpdatedAt(new Date().toISOString())
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : t("订单报表加载失败", "Failed to load orders"))
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

  const summary = useMemo(() => {
    const rows = data?.orders ?? []
    return {
      count: rows.length,
      total: rows.reduce((sum, row) => sum + row.total, 0),
      refunded: rows.reduce((sum, row) => sum + row.refunded_total, 0),
    }
  }, [data])

  const filteredRows = useMemo(() => {
    const rows = [...(data?.orders ?? [])]
    const q = query.trim().toLowerCase()

    const next = rows.filter((row) => {
      const matchesQuery =
        !q ||
        row.id.toLowerCase().includes(q) ||
        (row.customer_id || "").toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q)

      const matchesRefund = !refundFilter || row.refund_state === refundFilter
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "active" && !row.is_canceled) ||
        (statusFilter === "canceled" && row.is_canceled)

      return matchesQuery && matchesRefund && matchesStatus
    })

    next.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      if (sortKey === "created_at") {
        return (a.created_at || "").localeCompare(b.created_at || "") * dir
      }

      return (a[sortKey] - b[sortKey]) * dir
    })

    return next
  }, [data, query, statusFilter, refundFilter, sortKey, sortDir])

  const exportCurrentRows = () => {
    const lines = [
      "id,created_at,status,refund_state,customer_id,item_count,total,refunded_total,is_canceled",
      ...filteredRows.map((row) =>
        [
          row.id,
          row.created_at,
          row.status,
          row.refund_state,
          row.customer_id ?? "",
          row.item_count,
          row.total,
          row.refunded_total,
          row.is_canceled,
        ]
          .map(csvEscape)
          .join(",")
      ),
    ]

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `report-orders-${rangeSlug(data?.range)}-${slug(statusFilter || "all")}-${slug(refundFilter || "all")}-${slug(query || "all")}-page-${page}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    showNotice(t("CSV 已生成", "CSV prepared"), "success")
  }

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page])

  useEffect(() => {
    setPage(1)
  }, [query, statusFilter, refundFilter, sortKey, sortDir])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    syncUrl({
      q: query.trim() || undefined,
      view_status: statusFilter || undefined,
      refund_state: refundFilter || undefined,
      sort_key: sortKey,
      sort_dir: sortDir,
      page,
      columns: columns.length ? columns.join(",") : "none",
    })
  }, [query, statusFilter, refundFilter, sortKey, sortDir, page, columns])

  useEffect(() => {
    window.localStorage.setItem(ORDER_COLUMNS_STORAGE_KEY, JSON.stringify(columns))
  }, [columns])

  const toggleColumn = (column: OrderColumn) => {
    setColumns((current) =>
      current.includes(column) ? current.filter((item) => item !== column) : [...current, column]
    )
  }

  const resetColumns = () => {
    setColumns(DEFAULT_ORDER_COLUMNS)
  }

  const toggleSort = (key: "created_at" | "total" | "refunded_total") => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(key)
    setSortDir(key === "created_at" ? "desc" : "desc")
  }

  const sortLabel = (key: "created_at" | "total" | "refunded_total", label: string) =>
    `${label}${sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}`

  const clearFilters = () => {
    setQuery("")
    setStatusFilter("")
    setRefundFilter("")
    setSortKey("created_at")
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
        title={t("订单报表明细", "Report Orders")}
        subtitle={
          data
            ? t(`${data.range.start.slice(0, 10)} 至 ${data.range.end.slice(0, 10)}`, `${data.range.start.slice(0, 10)} to ${data.range.end.slice(0, 10)}`)
            : t("正在加载时间范围...", "Loading range...")
        }
        crumbs={[
          { label: t("报表", "Reports"), href: "/app/reports" },
          { label: t("订单", "Orders") },
        ]}
        aside={
          <div style={{ display: "flex", gap: 16, fontSize: 13, flexWrap: "wrap", ...metaTextStyle }}>
            <span>{t(`行数 ${summary.count}`, `Rows ${summary.count}`)}</span>
            <span>{t("总额", "Total")} {money(summary.total, data?.orders[0]?.currency_code || "aud")}</span>
            <span>{t("退款", "Refunded")} {money(summary.refunded, data?.orders[0]?.currency_code || "aud")}</span>
          </div>
        }
      />

      <div style={panelStyle}>
        <FilterToolbar onClear={clearFilters} clearLabel={t("清空筛选", "Clear Filters")}>
          <input
            style={{ ...toolbarInputStyle, minWidth: 220 }}
            placeholder={t("搜索订单 / 客户 / 状态", "Search order / customer / status")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            style={toolbarInputStyle}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "" | "active" | "canceled")}
          >
            <option value="">{t("全部订单状态", "All order states")}</option>
            <option value="active">{t("有效", "Active")}</option>
            <option value="canceled">{t("已取消", "Canceled")}</option>
          </select>
          <select
            style={toolbarInputStyle}
            value={refundFilter}
            onChange={(event) => setRefundFilter(event.target.value as "" | OrderRow["refund_state"])}
          >
            <option value="">{t("全部退款状态", "All refunds")}</option>
            <option value="none">{t("无退款", "none")}</option>
            <option value="partial">{t("部分退款", "partial")}</option>
            <option value="full">{t("全额退款", "full")}</option>
          </select>
          <select
            style={toolbarInputStyle}
            value={sortKey}
            onChange={(event) =>
              setSortKey(event.target.value as "created_at" | "total" | "refunded_total")
            }
          >
            <option value="created_at">{t("按日期排序", "Sort by date")}</option>
            <option value="total">{t("按总额排序", "Sort by total")}</option>
            <option value="refunded_total">{t("按退款排序", "Sort by refunded")}</option>
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
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
            <ToolbarToggleGroup
              label={t("显示列", "Visible columns")}
              options={[
                { key: "status", label: t("状态", "Status"), active: columns.includes("status"), onToggle: () => toggleColumn("status") },
                { key: "refund", label: t("退款状态", "Refund"), active: columns.includes("refund"), onToggle: () => toggleColumn("refund") },
                { key: "customer", label: t("客户", "Customer"), active: columns.includes("customer"), onToggle: () => toggleColumn("customer") },
                { key: "items", label: t("商品件数", "Items"), active: columns.includes("items"), onToggle: () => toggleColumn("items") },
                { key: "refunded", label: t("退款金额", "Refunded"), active: columns.includes("refunded"), onToggle: () => toggleColumn("refunded") },
              ]}
            />
            <button type="button" style={toolbarInputStyle} onClick={resetColumns}>
              {t("恢复默认列", "Reset Default Columns")}
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
        {!loading && !error ? (
          <>
          <ReportSummaryStrip
            items={[
              { label: t("筛选后行数", "Visible rows"), value: String(filteredRows.length) },
              { label: t("当前页行数", "Page rows"), value: String(pagedRows.length) },
              {
                label: t("销售总额", "Gross total"),
                value: money(filteredRows.reduce((sum, row) => sum + row.total, 0), data?.orders[0]?.currency_code || "aud"),
              },
              {
                label: t("退款总额", "Refunded total"),
                value: money(filteredRows.reduce((sum, row) => sum + row.refunded_total, 0), data?.orders[0]?.currency_code || "aud"),
              },
              ...(lastUpdatedAt ? [{ label: t("更新时间", "Updated"), value: new Date(lastUpdatedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }) }] : []),
            ]}
          />
          {!pagedRows.length ? (
            <ReportEmptyState
              title={t("没有符合当前筛选条件的订单", "No orders match the current filters")}
              body={t("可以尝试清空退款/状态筛选、放宽搜索条件，或者扩大日期范围。", "Try clearing refund or status filters, broadening the search term, or expanding the date range so more order activity falls into this view.")}
            />
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12, fontSize: 13, flexWrap: "wrap", ...subtleTextStyle }}>
            <span>
              {t("显示", "Showing")} {filteredRows.length ? (page - 1) * pageSize + 1 : 0}
              {"-"}
              {Math.min(page * pageSize, filteredRows.length)} {t("共", "of")} {filteredRows.length}
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
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr>
                  <th
                    style={tableHeaderBaseStyle}
                  >
                    {t("订单", "Order")}
                  </th>
                  <th
                    onClick={() => toggleSort("created_at")}
                    title={t("按创建时间排序", "Sort by created date")}
                    style={{ ...tableHeaderBaseStyle, color: sortKey === "created_at" ? adminTheme.color.primary : adminTheme.color.textMuted, ...sortableHeaderStyle }}
                  >
                    {sortLabel("created_at", t("创建时间", "Created"))}
                  </th>
                  {columns.includes("status") ? (
                    <th
                      style={tableHeaderBaseStyle}
                    >
                      {t("状态", "Status")}
                    </th>
                  ) : null}
                  {columns.includes("refund") ? (
                    <th
                      style={tableHeaderBaseStyle}
                    >
                      {t("退款状态", "Refund")}
                    </th>
                  ) : null}
                  {columns.includes("customer") ? (
                    <th
                      style={tableHeaderBaseStyle}
                    >
                      {t("客户", "Customer")}
                    </th>
                  ) : null}
                  {columns.includes("items") ? (
                    <th
                      style={tableHeaderBaseStyle}
                    >
                      {t("件数", "Items")}
                    </th>
                  ) : null}
                  <th
                    onClick={() => toggleSort("total")}
                    title={t("按订单总额排序", "Sort by order total")}
                    style={{ ...tableHeaderBaseStyle, color: sortKey === "total" ? adminTheme.color.primary : adminTheme.color.textMuted, ...sortableHeaderStyle }}
                  >
                    {sortLabel("total", t("总额", "Total"))}
                  </th>
                  {columns.includes("refunded") ? (
                    <th
                      onClick={() => toggleSort("refunded_total")}
                      title={t("按退款金额排序", "Sort by refunded total")}
                      style={{ ...tableHeaderBaseStyle, color: sortKey === "refunded_total" ? adminTheme.color.primary : adminTheme.color.textMuted, ...sortableHeaderStyle }}
                    >
                      {sortLabel("refunded_total", t("退款", "Refunded"))}
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => (
                  <tr key={row.id}>
                    <td style={tableCellStyle}>
                      <a
                        href={`/app/orders/${row.id}`}
                        style={{ ...tableLinkStyle, ...truncatedCellStyle }}
                      >
                        {row.id}
                      </a>
                    </td>
                    <td style={tableCellStyle}>
                      {row.created_at ? row.created_at.slice(0, 10) : "-"}
                    </td>
                    {columns.includes("status") ? (
                      <td style={tableCellStyle}>
                        {orderStatusBadge(row.status, row.is_canceled, t)}
                      </td>
                    ) : null}
                    {columns.includes("refund") ? (
                      <td style={tableCellStyle}>
                        {refundStateBadge(row.refund_state, t)}
                      </td>
                    ) : null}
                    {columns.includes("customer") ? (
                      <td style={{ ...tableCellStyle, ...truncatedCellStyle }}>
                        {row.customer_id || "-"}
                      </td>
                    ) : null}
                    {columns.includes("items") ? (
                      <td style={tableCellStyle}>{row.item_count}</td>
                    ) : null}
                    <td style={tableCellStyle}>
                      {money(row.total, row.currency_code)}
                    </td>
                    {columns.includes("refunded") ? (
                      <td style={tableCellStyle}>
                        {money(row.refunded_total, row.currency_code)}
                      </td>
                    ) : null}
                  </tr>
                ))}
                {!pagedRows.length ? (
                  <tr>
                    <td
                      colSpan={
                        2 +
                        (columns.includes("status") ? 1 : 0) +
                        (columns.includes("refund") ? 1 : 0) +
                        (columns.includes("customer") ? 1 : 0) +
                        (columns.includes("items") ? 1 : 0) +
                        1 +
                        (columns.includes("refunded") ? 1 : 0)
                      }
                      style={emptyStateStyle}
                    >
                      {t("没有符合当前筛选条件的订单。请尝试清空筛选或扩大日期范围。", "No orders matched the current filters. Try clearing filters or expanding the date range.")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "订单报表",
  rank: 91,
})

export default ReportOrdersPage
