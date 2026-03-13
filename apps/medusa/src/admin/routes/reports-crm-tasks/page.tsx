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

type Task = {
  id: string
  title: string
  description?: string | null
  type: "todo" | "call" | "email" | "meeting" | "follow_up"
  status: "open" | "in_progress" | "completed" | "canceled"
  priority: "low" | "medium" | "high" | "urgent"
  due_date?: string | null
  completed_at?: string | null
  owner_id?: string | null
  customer_id?: string | null
}

type TaskColumn = "description" | "type" | "status" | "priority" | "due" | "completed" | "customer"

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
  maxWidth: 260,
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

const TASK_COLUMNS_STORAGE_KEY = "artstore_report_crm_tasks_columns"
const DEFAULT_TASK_COLUMNS: TaskColumn[] = ["description", "type", "status", "priority", "due", "completed", "customer"]

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

const ReportCrmTasksPage = () => {
  const [rows, setRows] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdatedAt, setLastUpdatedAt] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const [sortKey, setSortKey] = useState<"title" | "status" | "priority">("title")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [columns, setColumns] = useState<TaskColumn[]>(DEFAULT_TASK_COLUMNS)
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
                .filter((value): value is TaskColumn =>
                  ["description", "type", "status", "priority", "due", "completed", "customer"].includes(value)
                )
        setStatus(nextStatus)
        setQuery(nextQuery)
        if (key === "title" || key === "status" || key === "priority") {
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
            const stored = window.localStorage.getItem(TASK_COLUMNS_STORAGE_KEY)
            if (stored) {
              const parsed = JSON.parse(stored) as TaskColumn[]
              if (Array.isArray(parsed)) {
                setColumns(parsed)
              }
            }
          } catch {
            // Ignore malformed local storage values.
          }
        }
        setLoading(true)
        const data = await api<{ tasks: Task[] }>("/admin/crm/tasks?limit=500&offset=0")
        if (active) {
          setRows(data.tasks || [])
          setLastUpdatedAt(new Date().toISOString())
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load tasks")
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
      const isOverdue =
        row.status !== "completed" &&
        row.status !== "canceled" &&
        !!row.due_date &&
        new Date(row.due_date).getTime() < Date.now()

      const matchesStatus =
        !status ||
        row.status === status ||
        (status === "overdue" && isOverdue)
      const matchesQuery =
        !q ||
        row.title.toLowerCase().includes(q) ||
        (row.description || "").toLowerCase().includes(q) ||
        (row.customer_id || "").toLowerCase().includes(q)
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
      page,
      columns: columns.length ? columns.join(",") : "none",
    })
  }, [query, status, sortKey, sortDir, page, columns])

  useEffect(() => {
    window.localStorage.setItem(TASK_COLUMNS_STORAGE_KEY, JSON.stringify(columns))
  }, [columns])

  const toggleColumn = (column: TaskColumn) => {
    setColumns((current) =>
      current.includes(column) ? current.filter((item) => item !== column) : [...current, column]
    )
  }

  const resetColumns = () => {
    setColumns(DEFAULT_TASK_COLUMNS)
  }

  const toggleSort = (key: "title" | "status" | "priority") => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(key)
    setSortDir("asc")
  }

  const sortLabel = (key: "title" | "status" | "priority", label: string) =>
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
      "id,title,description,type,status,priority,due_date,completed_at,owner_id,customer_id",
      ...filtered.map((row) =>
        [
          row.id,
          row.title,
          row.description ?? "",
          row.type,
          row.status,
          row.priority,
          row.due_date ?? "",
          row.completed_at ?? "",
          row.owner_id ?? "",
          row.customer_id ?? "",
        ]
          .map(csvEscape)
          .join(",")
      ),
    ]

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `crm-tasks-${slug(status || "all")}-${slug(query || "all")}-page-${page}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    showNotice("CSV prepared", "success")
  }

  const clearFilters = () => {
    setQuery("")
    setStatus("")
    setSortKey("title")
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
        title="Task Drill-down"
        subtitle="Filtered CRM task list for report drill-down."
        crumbs={[
          { label: "Reports", href: "/app/reports" },
          { label: "CRM", href: "/app/reports?view=crm" },
          { label: "Tasks" },
        ]}
      />

      <div style={panelStyle}>
        <FilterToolbar onClear={clearFilters}>
          <input
            style={{ ...toolbarInputStyle, minWidth: 260 }}
            placeholder="Search task"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select style={toolbarInputStyle} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="open">open</option>
            <option value="in_progress">in_progress</option>
            <option value="completed">completed</option>
            <option value="canceled">canceled</option>
            <option value="overdue">overdue</option>
          </select>
          <select style={toolbarInputStyle} value={sortKey} onChange={(event) => setSortKey(event.target.value as "title" | "status" | "priority")}>
            <option value="title">Sort by title</option>
            <option value="status">Sort by status</option>
            <option value="priority">Sort by priority</option>
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
                { key: "description", label: "Description", active: columns.includes("description"), onToggle: () => toggleColumn("description") },
                { key: "type", label: "Type", active: columns.includes("type"), onToggle: () => toggleColumn("type") },
                { key: "status", label: "Status", active: columns.includes("status"), onToggle: () => toggleColumn("status") },
                { key: "priority", label: "Priority", active: columns.includes("priority"), onToggle: () => toggleColumn("priority") },
                { key: "due", label: "Due", active: columns.includes("due"), onToggle: () => toggleColumn("due") },
                { key: "completed", label: "Completed", active: columns.includes("completed"), onToggle: () => toggleColumn("completed") },
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
                { label: "Visible tasks", value: String(filtered.length) },
                { label: "Page rows", value: String(pagedRows.length) },
                { label: "Completed", value: String(filtered.filter((row) => row.status === "completed").length) },
                {
                  label: "Overdue",
                  value: String(
                    filtered.filter(
                      (row) =>
                        row.status !== "completed" &&
                        row.status !== "canceled" &&
                        !!row.due_date &&
                        new Date(row.due_date).getTime() < Date.now()
                    ).length
                  ),
                },
                ...(lastUpdatedAt ? [{ label: "Updated", value: new Date(lastUpdatedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }) }] : []),
              ]}
            />
            {!pagedRows.length ? (
              <ReportEmptyState
                title="No tasks match the current filters"
                body="Try clearing the status filter, broadening the title search, or refreshing to include recently assigned or completed CRM tasks."
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
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
                <thead>
                  <tr>
                    <th onClick={() => toggleSort("title")} title="Sort by task title" style={{ textAlign: "left", padding: "10px 8px", fontSize: 12, color: sortKey === "title" ? "#173f8a" : "#607086", borderBottom: "1px solid #e5edf6", ...sortableHeaderStyle }}>
                      {sortLabel("title", "Title")}
                    </th>
                    {columns.includes("description") ? (
                      <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12, color: "#607086", borderBottom: "1px solid #e5edf6" }}>
                        Description
                      </th>
                    ) : null}
                    {columns.includes("type") ? (
                      <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12, color: "#607086", borderBottom: "1px solid #e5edf6" }}>
                        Type
                      </th>
                    ) : null}
                    {columns.includes("status") ? (
                      <th onClick={() => toggleSort("status")} title="Sort by task status" style={{ textAlign: "left", padding: "10px 8px", fontSize: 12, color: sortKey === "status" ? "#173f8a" : "#607086", borderBottom: "1px solid #e5edf6", ...sortableHeaderStyle }}>
                        {sortLabel("status", "Status")}
                      </th>
                    ) : null}
                    {columns.includes("priority") ? (
                      <th onClick={() => toggleSort("priority")} title="Sort by task priority" style={{ textAlign: "left", padding: "10px 8px", fontSize: 12, color: sortKey === "priority" ? "#173f8a" : "#607086", borderBottom: "1px solid #e5edf6", ...sortableHeaderStyle }}>
                        {sortLabel("priority", "Priority")}
                      </th>
                    ) : null}
                    {columns.includes("due") ? (
                      <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12, color: "#607086", borderBottom: "1px solid #e5edf6" }}>
                        Due
                      </th>
                    ) : null}
                    {columns.includes("completed") ? (
                      <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12, color: "#607086", borderBottom: "1px solid #e5edf6" }}>
                        Completed
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
                          href={`/app/crm?tab=task&q=${encodeURIComponent(row.title)}`}
                          style={{ color: "#173f8a", textDecoration: "none", display: "inline-block", ...truncatedCellStyle }}
                        >
                          {row.title}
                        </a>
                      </td>
                      {columns.includes("description") ? (
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8", ...truncatedCellStyle }}>{row.description || "-"}</td>
                      ) : null}
                      {columns.includes("type") ? (
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8" }}>{row.type}</td>
                      ) : null}
                      {columns.includes("status") ? (
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8" }}>{row.status}</td>
                      ) : null}
                      {columns.includes("priority") ? (
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8" }}>{row.priority}</td>
                      ) : null}
                      {columns.includes("due") ? (
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8" }}>{row.due_date || "-"}</td>
                      ) : null}
                      {columns.includes("completed") ? (
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8" }}>{row.completed_at || "-"}</td>
                      ) : null}
                      {columns.includes("customer") ? (
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #eef3f8", ...truncatedCellStyle }}>{row.customer_id || "-"}</td>
                      ) : null}
                    </tr>
                  ))}
                  {!pagedRows.length ? (
                    <tr>
                      <td
                        colSpan={1 + (columns.includes("description") ? 1 : 0) + (columns.includes("type") ? 1 : 0) + (columns.includes("status") ? 1 : 0) + (columns.includes("priority") ? 1 : 0) + (columns.includes("due") ? 1 : 0) + (columns.includes("completed") ? 1 : 0) + (columns.includes("customer") ? 1 : 0)}
                        style={emptyStateStyle}
                      >
                        No tasks matched the current filters. Try clearing status filters or searching for a broader title.
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
  rank: 95,
})

export default ReportCrmTasksPage
