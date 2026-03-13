import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useMemo, useState, type CSSProperties } from "react"
import FilterToolbar, {
  ToolbarToggleGroup,
  toolbarInputStyle,
} from "../reports/components/filter-toolbar"
import ReportActionBar from "../reports/components/report-action-bar"
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
  background: "#f4f7fb",
}

const panelStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #d9e3ef",
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
  color: "#607086",
  fontSize: 14,
}

const sortableHeaderStyle: CSSProperties = {
  cursor: "pointer",
  userSelect: "none",
  transition: "color 140ms ease",
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
          setError(err instanceof Error ? err.message : "Failed to load orders")
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
    showNotice("CSV prepared", "success")
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
      showNotice("Link copied", "success")
    } catch {
      showNotice("Copy failed", "error")
    }
  }

  const refreshReport = () => {
    setRefreshKey((value) => value + 1)
    showNotice("Refreshing...", "info", 1200)
  }

  return (
    <div style={shellStyle}>
      <ReportHeader
        title="Report Orders"
        subtitle={
          data
            ? `${data.range.start.slice(0, 10)} to ${data.range.end.slice(0, 10)}`
            : "Loading range..."
        }
        crumbs={[
          { label: "Reports", href: "/app/reports" },
          { label: "Orders" },
        ]}
        aside={
          <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#23364e", flexWrap: "wrap" }}>
            <span>Rows {summary.count}</span>
            <span>Total {money(summary.total, data?.orders[0]?.currency_code || "aud")}</span>
            <span>Refunded {money(summary.refunded, data?.orders[0]?.currency_code || "aud")}</span>
          </div>
        }
      />

      <div style={panelStyle}>
        <FilterToolbar onClear={clearFilters}>
          <input
            style={{ ...toolbarInputStyle, minWidth: 220 }}
            placeholder="Search order / customer / status"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            style={toolbarInputStyle}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "" | "active" | "canceled")}
          >
            <option value="">All order states</option>
            <option value="active">active</option>
            <option value="canceled">canceled</option>
          </select>
          <select
            style={toolbarInputStyle}
            value={refundFilter}
            onChange={(event) => setRefundFilter(event.target.value as "" | OrderRow["refund_state"])}
          >
            <option value="">All refunds</option>
            <option value="none">none</option>
            <option value="partial">partial</option>
            <option value="full">full</option>
          </select>
          <select
            style={toolbarInputStyle}
            value={sortKey}
            onChange={(event) =>
              setSortKey(event.target.value as "created_at" | "total" | "refunded_total")
            }
          >
            <option value="created_at">Sort by date</option>
            <option value="total">Sort by total</option>
            <option value="refunded_total">Sort by refunded</option>
          </select>
          <select
            style={toolbarInputStyle}
            value={sortDir}
            onChange={(event) => setSortDir(event.target.value as "asc" | "desc")}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
          <ReportActionBar
            actions={[
              { key: "export-filtered", label: "Export Filtered CSV", onClick: exportCurrentRows },
              { key: "copy-link", label: "Copy Filter Link", onClick: copyCurrentLink },
              { key: "refresh", label: loading ? "Refreshing..." : "Refresh", onClick: refreshReport, disabled: loading },
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
              label="Visible columns"
              options={[
                { key: "status", label: "Status", active: columns.includes("status"), onToggle: () => toggleColumn("status") },
                { key: "refund", label: "Refund", active: columns.includes("refund"), onToggle: () => toggleColumn("refund") },
                { key: "customer", label: "Customer", active: columns.includes("customer"), onToggle: () => toggleColumn("customer") },
                { key: "items", label: "Items", active: columns.includes("items"), onToggle: () => toggleColumn("items") },
                { key: "refunded", label: "Refunded", active: columns.includes("refunded"), onToggle: () => toggleColumn("refunded") },
              ]}
            />
            <button type="button" style={toolbarInputStyle} onClick={resetColumns}>
              Reset Default Columns
            </button>
          </div>
        </div>
        {loading ? <div>Loading...</div> : null}
        {error ? (
          <div
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #f2c7c7",
              background: "#fdecec",
              color: "#b42318",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span>{error}</span>
            <button type="button" style={toolbarInputStyle} onClick={refreshReport} disabled={loading}>
              {loading ? "Refreshing..." : "Retry"}
            </button>
          </div>
        ) : null}
        {!loading && !error ? (
          <>
          <ReportSummaryStrip
            items={[
              { label: "Visible rows", value: String(filteredRows.length) },
              { label: "Page rows", value: String(pagedRows.length) },
              {
                label: "Gross total",
                value: money(filteredRows.reduce((sum, row) => sum + row.total, 0), data?.orders[0]?.currency_code || "aud"),
              },
              {
                label: "Refunded total",
                value: money(filteredRows.reduce((sum, row) => sum + row.refunded_total, 0), data?.orders[0]?.currency_code || "aud"),
              },
              ...(lastUpdatedAt ? [{ label: "Updated", value: new Date(lastUpdatedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }) }] : []),
            ]}
          />
          {!pagedRows.length ? (
            <ReportEmptyState
              title="No orders match the current filters"
              body="Try clearing refund or status filters, broadening the search term, or expanding the date range so more order activity falls into this view."
            />
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12, fontSize: 13, color: "#607086", flexWrap: "wrap" }}>
            <span>
              Showing {filteredRows.length ? (page - 1) * pageSize + 1 : 0}
              {"-"}
              {Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length}
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                style={toolbarInputStyle}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1}
              >
                Prev
              </button>
              <span>Page {page} / {totalPages}</span>
              <button
                type="button"
                style={toolbarInputStyle}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr>
                  <th
                    style={{ textAlign: "left", fontSize: 12, color: "#607086", padding: "10px 8px", borderBottom: "1px solid #e5edf6" }}
                  >
                    Order
                  </th>
                  <th
                    onClick={() => toggleSort("created_at")}
                    title="Sort by created date"
                    style={{ textAlign: "left", fontSize: 12, color: sortKey === "created_at" ? "#173f8a" : "#607086", padding: "10px 8px", borderBottom: "1px solid #e5edf6", ...sortableHeaderStyle }}
                  >
                    {sortLabel("created_at", "Created")}
                  </th>
                  {columns.includes("status") ? (
                    <th
                      style={{ textAlign: "left", fontSize: 12, color: "#607086", padding: "10px 8px", borderBottom: "1px solid #e5edf6" }}
                    >
                      Status
                    </th>
                  ) : null}
                  {columns.includes("refund") ? (
                    <th
                      style={{ textAlign: "left", fontSize: 12, color: "#607086", padding: "10px 8px", borderBottom: "1px solid #e5edf6" }}
                    >
                      Refund
                    </th>
                  ) : null}
                  {columns.includes("customer") ? (
                    <th
                      style={{ textAlign: "left", fontSize: 12, color: "#607086", padding: "10px 8px", borderBottom: "1px solid #e5edf6" }}
                    >
                      Customer
                    </th>
                  ) : null}
                  {columns.includes("items") ? (
                    <th
                      style={{ textAlign: "left", fontSize: 12, color: "#607086", padding: "10px 8px", borderBottom: "1px solid #e5edf6" }}
                    >
                      Items
                    </th>
                  ) : null}
                  <th
                    onClick={() => toggleSort("total")}
                    title="Sort by order total"
                    style={{ textAlign: "left", fontSize: 12, color: sortKey === "total" ? "#173f8a" : "#607086", padding: "10px 8px", borderBottom: "1px solid #e5edf6", ...sortableHeaderStyle }}
                  >
                    {sortLabel("total", "Total")}
                  </th>
                  {columns.includes("refunded") ? (
                    <th
                      onClick={() => toggleSort("refunded_total")}
                      title="Sort by refunded total"
                      style={{ textAlign: "left", fontSize: 12, color: sortKey === "refunded_total" ? "#173f8a" : "#607086", padding: "10px 8px", borderBottom: "1px solid #e5edf6", ...sortableHeaderStyle }}
                    >
                      {sortLabel("refunded_total", "Refunded")}
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8" }}>
                      <a
                        href={`/app/orders/${row.id}`}
                        style={{ color: "#173f8a", textDecoration: "none", display: "inline-block", ...truncatedCellStyle }}
                      >
                        {row.id}
                      </a>
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8" }}>
                      {row.created_at ? row.created_at.slice(0, 10) : "-"}
                    </td>
                    {columns.includes("status") ? (
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8" }}>
                        {row.is_canceled ? "canceled" : row.status}
                      </td>
                    ) : null}
                    {columns.includes("refund") ? (
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8" }}>
                        {row.refund_state}
                      </td>
                    ) : null}
                    {columns.includes("customer") ? (
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8", ...truncatedCellStyle }}>
                        {row.customer_id || "-"}
                      </td>
                    ) : null}
                    {columns.includes("items") ? (
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8" }}>{row.item_count}</td>
                    ) : null}
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8" }}>
                      {money(row.total, row.currency_code)}
                    </td>
                    {columns.includes("refunded") ? (
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8" }}>
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
                      No orders matched the current filters. Try clearing filters or expanding the date range.
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
  rank: 91,
})

export default ReportOrdersPage
