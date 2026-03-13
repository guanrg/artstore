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

type Lead = {
  id: string
  name: string
  email: string
  company: string
  source: string
  status: "new" | "contacted" | "qualified" | "lost"
  customer_id?: string | null
}

type LeadColumn = "email" | "company" | "source" | "status" | "customer"

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

const LEAD_COLUMNS_STORAGE_KEY = "artstore_report_crm_leads_columns"
const DEFAULT_LEAD_COLUMNS: LeadColumn[] = ["email", "company", "source", "status", "customer"]

async function api<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: "include" })
  const data = (await response.json().catch(() => ({}))) as T & { message?: string }
  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`)
  }
  return data
}

function csvEscape(value: string | number | null | undefined) {
  const text = String(value ?? "")
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function slug(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase()
}

function syncUrl(params: Record<string, string | undefined>) {
  const search = new URLSearchParams(window.location.search)

  for (const [key, value] of Object.entries(params)) {
    if (!value) {
      search.delete(key)
    } else {
      search.set(key, value)
    }
  }

  window.history.replaceState({}, "", `${window.location.pathname}?${search.toString()}`)
}

const ReportCrmLeadsPage = () => {
  const [rows, setRows] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdatedAt, setLastUpdatedAt] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const [sortKey, setSortKey] = useState<"name" | "company" | "status">("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [columns, setColumns] = useState<LeadColumn[]>(DEFAULT_LEAD_COLUMNS)
  const pageSize = 25
  const { notice, showNotice } = useReportNotice()

  useEffect(() => {
    let active = true

    ;(async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const nextStatus = params.get("status") || ""
        const nextQuery = params.get("q") || ""
        const key = params.get("sort_key")
        const dir = params.get("sort_dir")
        const currentPage = Number(params.get("page") || "1")
        const rawColumns = params.get("columns") || ""
        const nextColumns =
          rawColumns === "none"
            ? []
            : rawColumns
                .split(",")
                .filter((value): value is LeadColumn =>
                  ["email", "company", "source", "status", "customer"].includes(value)
                )
        setStatus(nextStatus)
        setQuery(nextQuery)
        if (key === "name" || key === "company" || key === "status") {
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
            const stored = window.localStorage.getItem(LEAD_COLUMNS_STORAGE_KEY)
            if (stored) {
              const parsed = JSON.parse(stored) as LeadColumn[]
              if (Array.isArray(parsed)) {
                setColumns(parsed)
              }
            }
          } catch {
            // Ignore malformed local storage values.
          }
        }
        setLoading(true)
        const data = await api<{ leads: Lead[] }>("/admin/crm/leads?limit=500&offset=0")
        if (active) {
          setRows(data.leads || [])
          setLastUpdatedAt(new Date().toISOString())
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load leads")
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const next = rows.filter((row) => {
      const matchesStatus = !status || row.status === status
      const matchesQuery =
        !q ||
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.company.toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })

    next.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      return String(a[sortKey]).localeCompare(String(b[sortKey])) * dir
    })

    return next
  }, [rows, query, status, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page])

  useEffect(() => {
    syncUrl({
      q: query.trim() || undefined,
      status: status || undefined,
      sort_key: sortKey,
      sort_dir: sortDir,
      page: String(page),
      columns: columns.length ? columns.join(",") : "none",
    })
  }, [query, status, sortKey, sortDir, page, columns])

  useEffect(() => {
    window.localStorage.setItem(LEAD_COLUMNS_STORAGE_KEY, JSON.stringify(columns))
  }, [columns])

  const toggleColumn = (column: LeadColumn) => {
    setColumns((current) =>
      current.includes(column) ? current.filter((item) => item !== column) : [...current, column]
    )
  }

  const resetColumns = () => {
    setColumns(DEFAULT_LEAD_COLUMNS)
  }

  const toggleSort = (key: "name" | "company" | "status") => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(key)
    setSortDir("asc")
  }

  const sortLabel = (key: "name" | "company" | "status", label: string) =>
    `${label}${sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}`

  useEffect(() => {
    setPage(1)
  }, [query, status, sortKey, sortDir])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const exportCurrentRows = () => {
    const lines = [
      "id,name,email,company,source,status,customer_id",
      ...filtered.map((row) =>
        [row.id, row.name, row.email, row.company, row.source, row.status, row.customer_id ?? ""]
          .map(csvEscape)
          .join(",")
      ),
    ]

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `crm-leads-${slug(status || "all")}-${slug(query || "all")}-page-${page}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    showNotice("CSV prepared", "success")
  }

  const clearFilters = () => {
    setQuery("")
    setStatus("")
    setSortKey("name")
    setSortDir("asc")
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
        title="Lead Drill-down"
        subtitle="Filtered CRM lead list for report drill-down."
        crumbs={[
          { label: "Reports", href: "/app/reports" },
          { label: "CRM", href: "/app/reports?view=crm" },
          { label: "Leads" },
        ]}
      />

      <div style={panelStyle}>
        <FilterToolbar onClear={clearFilters}>
          <input
            style={{ ...toolbarInputStyle, minWidth: 260 }}
            placeholder="Search lead"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select style={toolbarInputStyle} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="new">new</option>
            <option value="contacted">contacted</option>
            <option value="qualified">qualified</option>
            <option value="lost">lost</option>
          </select>
          <select style={toolbarInputStyle} value={sortKey} onChange={(event) => setSortKey(event.target.value as "name" | "company" | "status")}>
            <option value="name">Sort by name</option>
            <option value="company">Sort by company</option>
            <option value="status">Sort by status</option>
          </select>
          <select style={toolbarInputStyle} value={sortDir} onChange={(event) => setSortDir(event.target.value as "asc" | "desc")}>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
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
                { key: "email", label: "Email", active: columns.includes("email"), onToggle: () => toggleColumn("email") },
                { key: "company", label: "Company", active: columns.includes("company"), onToggle: () => toggleColumn("company") },
                { key: "source", label: "Source", active: columns.includes("source"), onToggle: () => toggleColumn("source") },
                { key: "status", label: "Status", active: columns.includes("status"), onToggle: () => toggleColumn("status") },
                { key: "customer", label: "Customer", active: columns.includes("customer"), onToggle: () => toggleColumn("customer") },
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
              { label: "Visible leads", value: String(filtered.length) },
              { label: "Page rows", value: String(pagedRows.length) },
              { label: "Qualified", value: String(filtered.filter((row) => row.status === "qualified").length) },
              { label: "Lost", value: String(filtered.filter((row) => row.status === "lost").length) },
              ...(lastUpdatedAt ? [{ label: "Updated", value: new Date(lastUpdatedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }) }] : []),
            ]}
          />
          {!pagedRows.length ? (
            <ReportEmptyState
              title="No leads match the current filters"
              body="Try clearing the status filter, searching with a broader company or contact name, or refreshing to pick up newer CRM lead activity."
            />
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12, fontSize: 13, color: "#607086", flexWrap: "wrap" }}>
            <span>
              Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}
              {"-"}
              {Math.min(page * pageSize, filtered.length)} of {filtered.length}
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
                  <th onClick={() => toggleSort("name")} title="Sort by lead name" style={{ textAlign: "left", padding: "10px 8px", fontSize: 12, color: sortKey === "name" ? "#173f8a" : "#607086", borderBottom: "1px solid #e5edf6", ...sortableHeaderStyle }}>
                    {sortLabel("name", "Name")}
                  </th>
                  {columns.includes("email") ? (
                    <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12, color: "#607086", borderBottom: "1px solid #e5edf6" }}>
                      Email
                    </th>
                  ) : null}
                  {columns.includes("company") ? (
                    <th onClick={() => toggleSort("company")} title="Sort by company" style={{ textAlign: "left", padding: "10px 8px", fontSize: 12, color: sortKey === "company" ? "#173f8a" : "#607086", borderBottom: "1px solid #e5edf6", ...sortableHeaderStyle }}>
                      {sortLabel("company", "Company")}
                    </th>
                  ) : null}
                  {columns.includes("source") ? (
                    <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12, color: "#607086", borderBottom: "1px solid #e5edf6" }}>
                      Source
                    </th>
                  ) : null}
                  {columns.includes("status") ? (
                    <th onClick={() => toggleSort("status")} title="Sort by lead status" style={{ textAlign: "left", padding: "10px 8px", fontSize: 12, color: sortKey === "status" ? "#173f8a" : "#607086", borderBottom: "1px solid #e5edf6", ...sortableHeaderStyle }}>
                      {sortLabel("status", "Status")}
                    </th>
                  ) : null}
                  {columns.includes("customer") ? (
                    <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12, color: "#607086", borderBottom: "1px solid #e5edf6" }}>
                      Customer
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8" }}>
                      <a
                        href={`/app/crm?tab=lead&q=${encodeURIComponent(row.name)}`}
                        style={{ color: "#173f8a", textDecoration: "none", display: "inline-block", ...truncatedCellStyle }}
                      >
                        {row.name}
                      </a>
                    </td>
                    {columns.includes("email") ? (
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8", ...truncatedCellStyle }}>{row.email}</td>
                    ) : null}
                    {columns.includes("company") ? (
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8", ...truncatedCellStyle }}>{row.company}</td>
                    ) : null}
                    {columns.includes("source") ? (
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8" }}>{row.source}</td>
                    ) : null}
                    {columns.includes("status") ? (
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8" }}>{row.status}</td>
                    ) : null}
                    {columns.includes("customer") ? (
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8", ...truncatedCellStyle }}>{row.customer_id || "-"}</td>
                    ) : null}
                  </tr>
                ))}
                {!pagedRows.length ? (
                  <tr>
                    <td
                      colSpan={1 + (columns.includes("email") ? 1 : 0) + (columns.includes("company") ? 1 : 0) + (columns.includes("source") ? 1 : 0) + (columns.includes("status") ? 1 : 0) + (columns.includes("customer") ? 1 : 0)}
                      style={emptyStateStyle}
                    >
                      No leads matched the current filters. Try clearing filters or searching for a broader company or name.
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
  rank: 93,
})

export default ReportCrmLeadsPage
