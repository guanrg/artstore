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

type Opportunity = {
  id: string
  name: string
  estimated_amount: number | string
  customer_id: string
  stage: "prospecting" | "negotiation" | "closed_won" | "closed_lost"
  expected_close_date?: string | null
  lead_id?: string | null
}

type OpportunityColumn = "stage" | "customer" | "lead" | "expected_close" | "amount"

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
  maxWidth: 240,
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

const OPPORTUNITY_COLUMNS_STORAGE_KEY = "artstore_report_crm_opportunities_columns"
const DEFAULT_OPPORTUNITY_COLUMNS: OpportunityColumn[] = ["stage", "customer", "lead", "expected_close", "amount"]

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

function opportunityStageBadge(stage: Opportunity["stage"], t: (zh: string, en: string) => string) {
  const config = {
    prospecting: { label: t("初步接洽", "Prospecting"), tone: "accent" as const },
    negotiation: { label: t("谈判中", "Negotiation"), tone: "warning" as const },
    closed_won: { label: t("已赢单", "Closed won"), tone: "success" as const },
    closed_lost: { label: t("已丢单", "Closed lost"), tone: "danger" as const },
  }[stage]

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

const ReportCrmOpportunitiesPage = () => {
  const { t } = useAdminLanguage()
  const [rows, setRows] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdatedAt, setLastUpdatedAt] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [query, setQuery] = useState("")
  const [stage, setStage] = useState("")
  const [sortKey, setSortKey] = useState<"name" | "stage" | "customer_id">("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [columns, setColumns] = useState<OpportunityColumn[]>(DEFAULT_OPPORTUNITY_COLUMNS)
  const pageSize = 25
  const { notice, showNotice } = useReportNotice()

  useEffect(() => {
    let active = true

    ;(async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const nextStage = params.get("stage") || ""
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
                .filter((value): value is OpportunityColumn =>
                  ["stage", "customer", "lead", "expected_close", "amount"].includes(value)
                )
        setStage(nextStage)
        setQuery(nextQuery)
        if (key === "name" || key === "stage" || key === "customer_id") {
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
            const stored = window.localStorage.getItem(OPPORTUNITY_COLUMNS_STORAGE_KEY)
            if (stored) {
              const parsed = JSON.parse(stored) as OpportunityColumn[]
              if (Array.isArray(parsed)) {
                setColumns(parsed)
              }
            }
          } catch {
            // Ignore malformed local storage values.
          }
        }
        setLoading(true)
        const data = await api<{ opportunities: Opportunity[] }>("/admin/crm/opportunities?limit=500&offset=0")
        if (active) {
          setRows(data.opportunities || [])
          setLastUpdatedAt(new Date().toISOString())
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : t("商机报表加载失败", "Failed to load opportunities"))
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
      const matchesStage = !stage || row.stage === stage
      const matchesQuery =
        !q ||
        row.name.toLowerCase().includes(q) ||
        row.customer_id.toLowerCase().includes(q)
      return matchesStage && matchesQuery
    })

    next.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      return String(a[sortKey]).localeCompare(String(b[sortKey])) * dir
    })

    return next
  }, [rows, query, stage, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page])

  useEffect(() => {
    syncUrl({
      q: query.trim() || undefined,
      stage: stage || undefined,
      sort_key: sortKey,
      sort_dir: sortDir,
      page: String(page),
      columns: columns.length ? columns.join(",") : "none",
    })
  }, [query, stage, sortKey, sortDir, page, columns])

  useEffect(() => {
    window.localStorage.setItem(OPPORTUNITY_COLUMNS_STORAGE_KEY, JSON.stringify(columns))
  }, [columns])

  const toggleColumn = (column: OpportunityColumn) => {
    setColumns((current) =>
      current.includes(column) ? current.filter((item) => item !== column) : [...current, column]
    )
  }

  const resetColumns = () => {
    setColumns(DEFAULT_OPPORTUNITY_COLUMNS)
  }

  const toggleSort = (key: "name" | "stage" | "customer_id") => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(key)
    setSortDir("asc")
  }

  const sortLabel = (key: "name" | "stage" | "customer_id", label: string) =>
    `${label}${sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}`

  useEffect(() => {
    setPage(1)
  }, [query, stage, sortKey, sortDir])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const exportCurrentRows = () => {
    const lines = [
      "id,name,stage,customer_id,lead_id,expected_close_date,estimated_amount",
      ...filtered.map((row) =>
        [
          row.id,
          row.name,
          row.stage,
          row.customer_id,
          row.lead_id ?? "",
          row.expected_close_date ?? "",
          row.estimated_amount,
        ]
          .map(csvEscape)
          .join(",")
      ),
    ]

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `crm-opportunities-${slug(stage || "all")}-${slug(query || "all")}-page-${page}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    showNotice(t("CSV 已生成", "CSV prepared"), "success")
  }

  const clearFilters = () => {
    setQuery("")
    setStage("")
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
        title={t("商机报表明细", "Opportunity Drill-down")}
        subtitle={t("按报表筛选条件展示 CRM 商机明细。", "Filtered CRM opportunity list for report drill-down.")}
        crumbs={[
          { label: t("报表", "Reports"), href: "/app/reports" },
          { label: "CRM", href: "/app/reports?view=crm" },
          { label: t("商机", "Opportunities") },
        ]}
      />

      <div style={panelStyle}>
        <FilterToolbar onClear={clearFilters} clearLabel={t("清空筛选", "Clear Filters")}>
          <input
            style={{ ...toolbarInputStyle, minWidth: 260 }}
            placeholder={t("搜索商机", "Search opportunity")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select style={toolbarInputStyle} value={stage} onChange={(event) => setStage(event.target.value)}>
            <option value="">{t("全部阶段", "All stages")}</option>
            <option value="prospecting">{t("初步接洽", "Prospecting")}</option>
            <option value="negotiation">{t("谈判中", "Negotiation")}</option>
            <option value="closed_won">{t("已赢单", "Closed won")}</option>
            <option value="closed_lost">{t("已丢单", "Closed lost")}</option>
          </select>
          <select style={toolbarInputStyle} value={sortKey} onChange={(event) => setSortKey(event.target.value as "name" | "stage" | "customer_id")}>
            <option value="name">{t("按名称排序", "Sort by name")}</option>
            <option value="stage">{t("按阶段排序", "Sort by stage")}</option>
            <option value="customer_id">{t("按客户排序", "Sort by customer")}</option>
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
                { key: "stage", label: t("阶段", "Stage"), active: columns.includes("stage"), onToggle: () => toggleColumn("stage") },
                { key: "customer", label: t("客户", "Customer"), active: columns.includes("customer"), onToggle: () => toggleColumn("customer") },
                { key: "lead", label: t("线索", "Lead"), active: columns.includes("lead"), onToggle: () => toggleColumn("lead") },
                { key: "expected_close", label: t("预计成交", "Expected close"), active: columns.includes("expected_close"), onToggle: () => toggleColumn("expected_close") },
                { key: "amount", label: t("金额", "Amount"), active: columns.includes("amount"), onToggle: () => toggleColumn("amount") },
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
              { label: t("筛选后商机数", "Visible opportunities"), value: String(filtered.length) },
              { label: t("当前页行数", "Page rows"), value: String(pagedRows.length) },
              { label: t("已赢单", "Closed won"), value: String(filtered.filter((row) => row.stage === "closed_won").length) },
              { label: t("预计金额", "Estimated amount"), value: filtered.reduce((sum, row) => sum + Number(row.estimated_amount || 0), 0).toLocaleString("en-US") },
              ...(lastUpdatedAt ? [{ label: t("更新时间", "Updated"), value: new Date(lastUpdatedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }) }] : []),
            ]}
          />
          {!pagedRows.length ? (
            <ReportEmptyState
              title={t("没有符合当前筛选条件的商机", "No opportunities match the current filters")}
              body={t("可以尝试清空阶段筛选、扩大搜索范围，或刷新以拉取最新商机。", "Try clearing the stage filter, broadening the search term, or refreshing after recent CRM updates so active deals can appear here.")}
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
                  <th onClick={() => toggleSort("name")} title={t("按商机名称排序", "Sort by opportunity name")} style={{ ...tableHeaderBaseStyle, color: sortKey === "name" ? adminTheme.color.primary : adminTheme.color.textMuted, ...sortableHeaderStyle }}>
                    {sortLabel("name", t("名称", "Name"))}
                  </th>
                  {columns.includes("stage") ? (
                    <th onClick={() => toggleSort("stage")} title={t("按商机阶段排序", "Sort by opportunity stage")} style={{ ...tableHeaderBaseStyle, color: sortKey === "stage" ? adminTheme.color.primary : adminTheme.color.textMuted, ...sortableHeaderStyle }}>
                      {sortLabel("stage", t("阶段", "Stage"))}
                    </th>
                  ) : null}
                  {columns.includes("customer") ? (
                    <th onClick={() => toggleSort("customer_id")} title={t("按客户排序", "Sort by customer")} style={{ ...tableHeaderBaseStyle, color: sortKey === "customer_id" ? adminTheme.color.primary : adminTheme.color.textMuted, ...sortableHeaderStyle }}>
                      {sortLabel("customer_id", t("客户", "Customer"))}
                    </th>
                  ) : null}
                  {columns.includes("lead") ? (
                    <th style={tableHeaderBaseStyle}>
                      {t("线索", "Lead")}
                    </th>
                  ) : null}
                  {columns.includes("expected_close") ? (
                    <th style={tableHeaderBaseStyle}>
                      {t("预计成交时间", "Expected Close")}
                    </th>
                  ) : null}
                  {columns.includes("amount") ? (
                    <th style={tableHeaderBaseStyle}>
                      {t("金额", "Amount")}
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => (
                  <tr key={row.id}>
                    <td style={tableCellStyle}>
                      <a
                        href={`/app/crm?tab=opportunity&q=${encodeURIComponent(row.name)}`}
                        style={{ ...tableLinkStyle, ...truncatedCellStyle }}
                      >
                        {row.name}
                      </a>
                    </td>
                    {columns.includes("stage") ? (
                      <td style={tableCellStyle}>{opportunityStageBadge(row.stage, t)}</td>
                    ) : null}
                    {columns.includes("customer") ? (
                      <td style={{ ...tableCellStyle, ...truncatedCellStyle }}>{row.customer_id}</td>
                    ) : null}
                    {columns.includes("lead") ? (
                      <td style={{ ...tableCellStyle, ...truncatedCellStyle }}>{row.lead_id || "-"}</td>
                    ) : null}
                    {columns.includes("expected_close") ? (
                      <td style={tableCellStyle}>{row.expected_close_date || "-"}</td>
                    ) : null}
                    {columns.includes("amount") ? (
                      <td style={{ ...tableCellStyle, ...truncatedCellStyle }}>{String(row.estimated_amount)}</td>
                    ) : null}
                  </tr>
                ))}
                {!pagedRows.length ? (
                  <tr>
                    <td
                      colSpan={1 + (columns.includes("stage") ? 1 : 0) + (columns.includes("customer") ? 1 : 0) + (columns.includes("lead") ? 1 : 0) + (columns.includes("expected_close") ? 1 : 0) + (columns.includes("amount") ? 1 : 0)}
                      style={emptyStateStyle}
                    >
                      {t("没有符合当前筛选条件的商机。请尝试清空阶段筛选或扩大搜索范围。", "No opportunities matched the current filters. Try clearing stage filters or broadening the search.")}
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
  label: "商机报表",
  rank: 94,
})

export default ReportCrmOpportunitiesPage
