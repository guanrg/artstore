import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useMemo, useState, type CSSProperties } from "react"
import FilterToolbar, {
  ToolbarToggleGroup,
  toolbarInputStyle,
} from "../reports/components/filter-toolbar"
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
  background: "#f4f7fb",
}

const panelStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #d9e3ef",
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
  color: "#607086",
  fontSize: 14,
}

const sortableHeaderStyle: CSSProperties = {
  cursor: "pointer",
  userSelect: "none",
  transition: "color 140ms ease",
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
          setError(err instanceof Error ? err.message : "Failed to load products")
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
    showNotice("CSV prepared", "success")
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
        title="Product Sales Breakdown"
        subtitle={
          data
            ? `${data.range.start.slice(0, 10)} to ${data.range.end.slice(0, 10)}`
            : "Loading range..."
        }
        crumbs={[
          { label: "Reports", href: "/app/reports" },
          { label: "Products" },
        ]}
        aside={
          <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#23364e", flexWrap: "wrap" }}>
            <span>Products {summary.count}</span>
            <span>Units {summary.quantity}</span>
            <span>Sales {summary.sales.toLocaleString("en-US")}</span>
          </div>
        }
      />

      <div style={panelStyle}>
        <FilterToolbar onClear={clearFilters}>
          <input
            style={{ ...toolbarInputStyle, minWidth: 260 }}
            placeholder="Search product title"
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
            <option value="sales">Sort by sales</option>
            <option value="quantity">Sort by units</option>
            <option value="orders">Sort by line items</option>
            <option value="title">Sort by title</option>
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
              { key: "export-summary", label: "Export Summary CSV", href: exportHref },
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
        <div style={{ marginBottom: 12, display: "flex", gap: 16, fontSize: 13, color: "#23364e", flexWrap: "wrap" }}>
          {lastUpdatedAt ? (
            <span>
              Updated {new Date(lastUpdatedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : null}
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
            <ToolbarToggleGroup
              label="Visible columns"
              options={[
                { key: "quantity", label: "Units", active: columns.includes("quantity"), onToggle: () => toggleColumn("quantity") },
                { key: "orders", label: "Line items", active: columns.includes("orders"), onToggle: () => toggleColumn("orders") },
                { key: "sales", label: "Sales", active: columns.includes("sales"), onToggle: () => toggleColumn("sales") },
              ]}
            />
            <button type="button" style={toolbarInputStyle} onClick={resetColumns}>
              Reset Default Columns
            </button>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12, fontSize: 13, color: "#607086", flexWrap: "wrap" }}>
          <span>
            Showing {filteredProducts.length ? (page - 1) * pageSize + 1 : 0}
            {"-"}
            {Math.min(page * pageSize, filteredProducts.length)} of {filteredProducts.length}
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
        {!loading && !error && !pagedProducts.length ? (
          <ReportEmptyState
            title="No products match the current filters"
            body="Try clearing the product search, switching sort focus, or expanding the date range so the report can include more product sales activity."
          />
        ) : null}
        {!loading && !error ? (
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr>
                  <th
                    onClick={() => toggleSort("title")}
                    title="Sort by product title"
                    style={{ textAlign: "left", fontSize: 12, color: sortKey === "title" ? "#173f8a" : "#607086", padding: "10px 8px", borderBottom: "1px solid #e5edf6", ...sortableHeaderStyle }}
                  >
                    {sortLabel("title", "Product")}
                  </th>
                  {columns.includes("quantity") ? (
                    <th
                      onClick={() => toggleSort("quantity")}
                      title="Sort by units sold"
                      style={{ textAlign: "left", fontSize: 12, color: sortKey === "quantity" ? "#173f8a" : "#607086", padding: "10px 8px", borderBottom: "1px solid #e5edf6", ...sortableHeaderStyle }}
                    >
                      {sortLabel("quantity", "Units Sold")}
                    </th>
                  ) : null}
                  {columns.includes("orders") ? (
                    <th
                      onClick={() => toggleSort("orders")}
                      title="Sort by line item count"
                      style={{ textAlign: "left", fontSize: 12, color: sortKey === "orders" ? "#173f8a" : "#607086", padding: "10px 8px", borderBottom: "1px solid #e5edf6", ...sortableHeaderStyle }}
                    >
                      {sortLabel("orders", "Line Items")}
                    </th>
                  ) : null}
                  {columns.includes("sales") ? (
                    <th
                      onClick={() => toggleSort("sales")}
                      title="Sort by sales"
                      style={{ textAlign: "left", fontSize: 12, color: sortKey === "sales" ? "#173f8a" : "#607086", padding: "10px 8px", borderBottom: "1px solid #e5edf6", ...sortableHeaderStyle }}
                    >
                      {sortLabel("sales", "Sales")}
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {pagedProducts.map((row) => (
                  <tr key={row.title}>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8" }}>
                      <a
                        href={`/app/products?q=${encodeURIComponent(row.title)}`}
                        style={{ color: "#173f8a", textDecoration: "none", display: "inline-block", ...truncatedCellStyle }}
                      >
                        {row.title}
                      </a>
                    </td>
                    {columns.includes("quantity") ? (
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8" }}>{row.quantity}</td>
                    ) : null}
                    {columns.includes("orders") ? (
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8" }}>{row.orders}</td>
                    ) : null}
                    {columns.includes("sales") ? (
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8" }}>
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
                      No products matched the current filters. Try clearing the search or adjusting the date range.
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
  rank: 92,
})

export default ReportProductsPage
