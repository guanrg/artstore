import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useMemo, useState, type CSSProperties } from "react"
import AdminLanguageDock from "../../components/admin-language-dock"
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
  background: `linear-gradient(180deg, ${adminTheme.color.canvas} 0%, ${adminTheme.color.canvasAlt} 100%)`,
}

const panelStyle: CSSProperties = {
  ...adminCardStyle,
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
  color: adminTheme.color.textMuted,
  fontSize: 14,
}

const sortableHeaderStyle: CSSProperties = {
  cursor: "pointer",
  userSelect: "none",
  transition: "color 140ms ease",
}

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
  padding: "10px 8px",
  fontSize: 12,
  color: adminTheme.color.textMuted,
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

function taskStatusBadge(status: Task["status"], t: (zh: string, en: string) => string) {
  const config = {
    open: { label: t("待处理", "Open"), tone: "accent" as const },
    in_progress: { label: t("进行中", "In progress"), tone: "warning" as const },
    completed: { label: t("已完成", "Completed"), tone: "success" as const },
    canceled: { label: t("已取消", "Canceled"), tone: "danger" as const },
  }[status]

  return <ReportBadge tone={config.tone}>{config.label}</ReportBadge>
}

function taskPriorityBadge(priority: Task["priority"], t: (zh: string, en: string) => string) {
  const config = {
    low: { label: t("低", "Low"), tone: "neutral" as const },
    medium: { label: t("中", "Medium"), tone: "info" as const },
    high: { label: t("高", "High"), tone: "warning" as const },
    urgent: { label: t("紧急", "Urgent"), tone: "danger" as const },
  }[priority]

  return <ReportBadge tone={config.tone}>{config.label}</ReportBadge>
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
  const { t } = useAdminLanguage()
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
          setError(err instanceof Error ? err.message : t("任务报表加载失败", "Failed to load tasks"))
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
    showNotice(t("CSV 已生成", "CSV prepared"), "success")
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
        title={t("任务报表明细", "Task Drill-down")}
        subtitle={t("按报表筛选条件展示 CRM 任务明细。", "Filtered CRM task list for report drill-down.")}
        crumbs={[
          { label: t("报表", "Reports"), href: "/app/reports" },
          { label: "CRM", href: "/app/reports?view=crm" },
          { label: t("任务", "Tasks") },
        ]}
      />

      <div style={panelStyle}>
        <FilterToolbar onClear={clearFilters} clearLabel={t("清空筛选", "Clear Filters")}>
          <input
            style={{ ...toolbarInputStyle, minWidth: 260 }}
            placeholder={t("搜索任务", "Search task")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select style={toolbarInputStyle} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{t("全部状态", "All statuses")}</option>
            <option value="open">{t("待处理", "open")}</option>
            <option value="in_progress">{t("进行中", "in_progress")}</option>
            <option value="completed">{t("已完成", "completed")}</option>
            <option value="canceled">{t("已取消", "Canceled")}</option>
            <option value="overdue">{t("已逾期", "overdue")}</option>
          </select>
          <select style={toolbarInputStyle} value={sortKey} onChange={(event) => setSortKey(event.target.value as "title" | "status" | "priority")}>
            <option value="title">{t("按标题排序", "Sort by title")}</option>
            <option value="status">{t("按状态排序", "Sort by status")}</option>
            <option value="priority">{t("按优先级排序", "Sort by priority")}</option>
          </select>
          <select style={toolbarInputStyle} value={sortDir} onChange={(event) => setSortDir(event.target.value as "asc" | "desc")}>
            <option value="asc">{t("升序", "Ascending")}</option>
            <option value="desc">{t("降序", "Descending")}</option>
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
                { key: "description", label: t("描述", "Description"), active: columns.includes("description"), onToggle: () => toggleColumn("description") },
                { key: "type", label: t("类型", "Type"), active: columns.includes("type"), onToggle: () => toggleColumn("type") },
                { key: "status", label: t("状态", "Status"), active: columns.includes("status"), onToggle: () => toggleColumn("status") },
                { key: "priority", label: t("优先级", "Priority"), active: columns.includes("priority"), onToggle: () => toggleColumn("priority") },
                { key: "due", label: t("截止日期", "Due"), active: columns.includes("due"), onToggle: () => toggleColumn("due") },
                { key: "completed", label: t("完成时间", "Completed"), active: columns.includes("completed"), onToggle: () => toggleColumn("completed") },
                { key: "customer", label: t("客户", "Customer"), active: columns.includes("customer"), onToggle: () => toggleColumn("customer") },
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
                { label: t("筛选后任务数", "Visible tasks"), value: String(filtered.length) },
                { label: t("当前页行数", "Page rows"), value: String(pagedRows.length) },
                { label: t("已完成", "Completed"), value: String(filtered.filter((row) => row.status === "completed").length) },
                {
                  label: t("已逾期", "Overdue"),
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
                ...(lastUpdatedAt ? [{ label: t("更新时间", "Updated"), value: new Date(lastUpdatedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }) }] : []),
              ]}
            />
            {!pagedRows.length ? (
              <ReportEmptyState
                title={t("没有符合当前筛选条件的任务", "No tasks match the current filters")}
                body={t("可以尝试清空状态筛选、扩大标题搜索范围，或刷新以拉取最新任务。", "Try clearing the status filter, broadening the title search, or refreshing to include recently assigned or completed CRM tasks.")}
              />
            ) : null}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12, fontSize: 13, flexWrap: "wrap", ...subtleTextStyle }}>
              <span>
                {t("显示", "Showing")} {filtered.length ? (page - 1) * pageSize + 1 : 0}
                {"-"}
                {Math.min(page * pageSize, filtered.length)} {t("共", "of")} {filtered.length}
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
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
                <thead>
                  <tr>
                    <th onClick={() => toggleSort("title")} title={t("按任务标题排序", "Sort by task title")} style={{ ...tableHeaderBaseStyle, color: sortKey === "title" ? adminTheme.color.primary : adminTheme.color.textMuted, ...sortableHeaderStyle }}>
                      {sortLabel("title", t("标题", "Title"))}
                    </th>
                    {columns.includes("description") ? (
                      <th style={tableHeaderBaseStyle}>
                        {t("描述", "Description")}
                      </th>
                    ) : null}
                    {columns.includes("type") ? (
                      <th style={tableHeaderBaseStyle}>
                        {t("类型", "Type")}
                      </th>
                    ) : null}
                    {columns.includes("status") ? (
                      <th onClick={() => toggleSort("status")} title={t("按任务状态排序", "Sort by task status")} style={{ ...tableHeaderBaseStyle, color: sortKey === "status" ? adminTheme.color.primary : adminTheme.color.textMuted, ...sortableHeaderStyle }}>
                        {sortLabel("status", t("状态", "Status"))}
                      </th>
                    ) : null}
                    {columns.includes("priority") ? (
                      <th onClick={() => toggleSort("priority")} title={t("按任务优先级排序", "Sort by task priority")} style={{ ...tableHeaderBaseStyle, color: sortKey === "priority" ? adminTheme.color.primary : adminTheme.color.textMuted, ...sortableHeaderStyle }}>
                        {sortLabel("priority", t("优先级", "Priority"))}
                      </th>
                    ) : null}
                    {columns.includes("due") ? (
                      <th style={tableHeaderBaseStyle}>
                        {t("截止日期", "Due")}
                      </th>
                    ) : null}
                    {columns.includes("completed") ? (
                      <th style={tableHeaderBaseStyle}>
                        {t("完成时间", "Completed")}
                      </th>
                    ) : null}
                    {columns.includes("customer") ? (
                      <th style={tableHeaderBaseStyle}>
                        {t("客户", "Customer")}
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row) => (
                    <tr key={row.id}>
                      <td style={tableCellStyle}>
                        <a
                          href={`/app/crm?tab=task&q=${encodeURIComponent(row.title)}`}
                          style={{ ...tableLinkStyle, ...truncatedCellStyle }}
                        >
                          {row.title}
                        </a>
                      </td>
                      {columns.includes("description") ? (
                        <td style={{ ...tableCellStyle, ...truncatedCellStyle }}>{row.description || "-"}</td>
                      ) : null}
                      {columns.includes("type") ? (
                        <td style={tableCellStyle}>{row.type}</td>
                      ) : null}
                      {columns.includes("status") ? (
                        <td style={tableCellStyle}>{taskStatusBadge(row.status, t)}</td>
                      ) : null}
                      {columns.includes("priority") ? (
                        <td style={tableCellStyle}>{taskPriorityBadge(row.priority, t)}</td>
                      ) : null}
                      {columns.includes("due") ? (
                        <td style={tableCellStyle}>{row.due_date || "-"}</td>
                      ) : null}
                      {columns.includes("completed") ? (
                        <td style={tableCellStyle}>{row.completed_at || "-"}</td>
                      ) : null}
                      {columns.includes("customer") ? (
                        <td style={{ ...tableCellStyle, ...truncatedCellStyle }}>{row.customer_id || "-"}</td>
                      ) : null}
                    </tr>
                  ))}
                  {!pagedRows.length ? (
                    <tr>
                      <td
                        colSpan={1 + (columns.includes("description") ? 1 : 0) + (columns.includes("type") ? 1 : 0) + (columns.includes("status") ? 1 : 0) + (columns.includes("priority") ? 1 : 0) + (columns.includes("due") ? 1 : 0) + (columns.includes("completed") ? 1 : 0) + (columns.includes("customer") ? 1 : 0)}
                        style={emptyStateStyle}
                      >
                        {t("没有符合当前筛选条件的任务。请尝试清空状态筛选或扩大标题搜索范围。", "No tasks matched the current filters. Try clearing status filters or searching for a broader title.")}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
      <AdminLanguageDock />
    </div>
  )
}

export const config = defineRouteConfig({
  label: "任务报表",
  rank: 95,
})

export default ReportCrmTasksPage
