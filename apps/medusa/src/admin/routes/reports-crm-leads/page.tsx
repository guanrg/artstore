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

function leadStatusBadge(status: Lead["status"], t: (zh: string, en: string) => string) {
  const config = {
    new: { label: t("新线索", "New"), tone: "accent" as const },
    contacted: { label: t("已联系", "Contacted"), tone: "info" as const },
    qualified: { label: t("已确认", "Qualified"), tone: "success" as const },
    lost: { label: t("已流失", "Lost"), tone: "danger" as const },
  }[status]

  return <ReportBadge tone={config.tone}>{config.label}</ReportBadge>
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
  const { t } = useAdminLanguage()
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
          setError(err instanceof Error ? err.message : t("线索报表加载失败", "Failed to load leads"))
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
    showNotice(t("CSV 已生成", "CSV prepared"), "success")
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
        title={t("线索报表明细", "Lead Drill-down")}
        subtitle={t("按报表筛选条件展示 CRM 线索明细。", "Filtered CRM lead list for report drill-down.")}
        crumbs={[
          { label: t("报表", "Reports"), href: "/app/reports" },
          { label: "CRM", href: "/app/reports?view=crm" },
          { label: t("线索", "Leads") },
        ]}
      />

      <div style={panelStyle}>
        <FilterToolbar onClear={clearFilters} clearLabel={t("清空筛选", "Clear Filters")}>
          <input
            style={{ ...toolbarInputStyle, minWidth: 260 }}
            placeholder={t("搜索线索", "Search lead")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select style={toolbarInputStyle} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{t("全部状态", "All statuses")}</option>
            <option value="new">{t("新线索", "New")}</option>
            <option value="contacted">{t("已联系", "Contacted")}</option>
            <option value="qualified">{t("已确认", "Qualified")}</option>
            <option value="lost">{t("已流失", "Lost")}</option>
          </select>
          <select style={toolbarInputStyle} value={sortKey} onChange={(event) => setSortKey(event.target.value as "name" | "company" | "status")}>
            <option value="name">{t("按名称排序", "Sort by name")}</option>
            <option value="company">{t("按公司排序", "Sort by company")}</option>
            <option value="status">{t("按状态排序", "Sort by status")}</option>
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
                { key: "email", label: t("邮箱", "Email"), active: columns.includes("email"), onToggle: () => toggleColumn("email") },
                { key: "company", label: t("公司", "Company"), active: columns.includes("company"), onToggle: () => toggleColumn("company") },
                { key: "source", label: t("来源", "Source"), active: columns.includes("source"), onToggle: () => toggleColumn("source") },
                { key: "status", label: t("状态", "Status"), active: columns.includes("status"), onToggle: () => toggleColumn("status") },
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
              { label: t("筛选后线索数", "Visible leads"), value: String(filtered.length) },
              { label: t("当前页行数", "Page rows"), value: String(pagedRows.length) },
              { label: t("已确认", "Qualified"), value: String(filtered.filter((row) => row.status === "qualified").length) },
              { label: t("已流失", "Lost"), value: String(filtered.filter((row) => row.status === "lost").length) },
              ...(lastUpdatedAt ? [{ label: t("更新时间", "Updated"), value: new Date(lastUpdatedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }) }] : []),
            ]}
          />
          {!pagedRows.length ? (
            <ReportEmptyState
              title={t("没有符合当前筛选条件的线索", "No leads match the current filters")}
              body={t("可以尝试清空状态筛选、扩大公司/联系人搜索范围，或刷新以获取最新线索。", "Try clearing the status filter, searching with a broader company or contact name, or refreshing to pick up newer CRM lead activity.")}
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
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr>
                  <th onClick={() => toggleSort("name")} title={t("按线索名称排序", "Sort by lead name")} style={{ ...tableHeaderBaseStyle, color: sortKey === "name" ? adminTheme.color.primary : adminTheme.color.textMuted, ...sortableHeaderStyle }}>
                    {sortLabel("name", t("名称", "Name"))}
                  </th>
                  {columns.includes("email") ? (
                    <th style={tableHeaderBaseStyle}>
                      {t("邮箱", "Email")}
                    </th>
                  ) : null}
                  {columns.includes("company") ? (
                    <th onClick={() => toggleSort("company")} title={t("按公司排序", "Sort by company")} style={{ ...tableHeaderBaseStyle, color: sortKey === "company" ? adminTheme.color.primary : adminTheme.color.textMuted, ...sortableHeaderStyle }}>
                      {sortLabel("company", t("公司", "Company"))}
                    </th>
                  ) : null}
                  {columns.includes("source") ? (
                    <th style={tableHeaderBaseStyle}>
                      {t("来源", "Source")}
                    </th>
                  ) : null}
                  {columns.includes("status") ? (
                    <th onClick={() => toggleSort("status")} title={t("按线索状态排序", "Sort by lead status")} style={{ ...tableHeaderBaseStyle, color: sortKey === "status" ? adminTheme.color.primary : adminTheme.color.textMuted, ...sortableHeaderStyle }}>
                      {sortLabel("status", t("状态", "Status"))}
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
                        href={`/app/crm?tab=lead&q=${encodeURIComponent(row.name)}`}
                        style={{ ...tableLinkStyle, ...truncatedCellStyle }}
                      >
                        {row.name}
                      </a>
                    </td>
                    {columns.includes("email") ? (
                      <td style={{ ...tableCellStyle, ...truncatedCellStyle }}>{row.email}</td>
                    ) : null}
                    {columns.includes("company") ? (
                      <td style={{ ...tableCellStyle, ...truncatedCellStyle }}>{row.company}</td>
                    ) : null}
                    {columns.includes("source") ? (
                      <td style={tableCellStyle}>{row.source}</td>
                    ) : null}
                    {columns.includes("status") ? (
                      <td style={tableCellStyle}>{leadStatusBadge(row.status, t)}</td>
                    ) : null}
                    {columns.includes("customer") ? (
                      <td style={{ ...tableCellStyle, ...truncatedCellStyle }}>{row.customer_id || "-"}</td>
                    ) : null}
                  </tr>
                ))}
                {!pagedRows.length ? (
                  <tr>
                    <td
                      colSpan={1 + (columns.includes("email") ? 1 : 0) + (columns.includes("company") ? 1 : 0) + (columns.includes("source") ? 1 : 0) + (columns.includes("status") ? 1 : 0) + (columns.includes("customer") ? 1 : 0)}
                      style={emptyStateStyle}
                    >
                      {t("没有符合当前筛选条件的线索。请尝试清空筛选或扩大搜索范围。", "No leads matched the current filters. Try clearing filters or searching for a broader company or name.")}
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
  label: "线索报表",
  rank: 93,
})

export default ReportCrmLeadsPage
