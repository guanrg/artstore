import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useMemo, useState, type CSSProperties } from "react"
import ReportHeader from "./components/report-header"

type ReportResponse = {
  range: {
    start: string
    end: string
    days: number
  }
  currency_code: string
  summary: {
    total_sales: number
    net_sales: number
    orders_count: number
    avg_order_value: number
    new_customers: number
    active_customers: number
    open_tasks: number
    total_leads: number
    total_opportunities: number
    pipeline_amount: number
    won_amount: number
    refunded_total: number
    refunded_orders: number
    full_refund_orders: number
    partial_refund_orders: number
    canceled_orders: number
    canceled_sales: number
    total_sales_display: string
    net_sales_display: string
    avg_order_value_display: string
    pipeline_amount_display: string
    won_amount_display: string
    refunded_total_display: string
    canceled_sales_display: string
  }
  sales_trend: Array<{
    date: string
    sales: number
    orders: number
  }>
  top_products: Array<{
    title: string
    quantity: number
    sales: number
    orders: number
  }>
  crm: {
    lead_status: Record<string, number>
    opportunity_stage: Record<string, number>
    task_status: Record<string, number>
    conversion_rate: number
  }
}

type SavedView = {
  id: string
  name: string
  pinned?: boolean
  dashboardView: "overview" | "sales" | "crm" | "operations"
  mode: "preset" | "custom"
  days: number
  startDate: string
  endDate: string
}

type NoticeState = {
  tone: "info" | "success" | "error"
  message: string
}

const pageStyle: CSSProperties = {
  minHeight: "100%",
  padding: 16,
  background:
    "radial-gradient(circle at top left, rgba(255, 245, 212, 0.9), transparent 28%), linear-gradient(180deg, #f6f8fb 0%, #eef3f8 100%)",
  display: "grid",
  gap: 16,
}

const toolbarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
}

const heroStyle: CSSProperties = {
  borderRadius: 18,
  padding: 20,
  color: "#10243e",
  border: "1px solid #d7e1ec",
  background: "linear-gradient(135deg, #fff8e7 0%, #edf6ff 65%, #ffffff 100%)",
  boxShadow: "0 18px 40px rgba(23, 42, 79, 0.08)",
}

const cardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
}

const statCardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #d9e3ef",
  borderRadius: 16,
  padding: 14,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
}

const interactiveCardStyle: CSSProperties = {
  ...statCardStyle,
  transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
}

const sectionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.7fr) minmax(320px, 1fr)",
  gap: 16,
}

const panelStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #d9e3ef",
  borderRadius: 18,
  padding: 16,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
}

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: "#5b6b82",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
}

const valueStyle: CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
  color: "#132238",
}

const buttonBaseStyle: CSSProperties = {
  border: "1px solid #cad7e6",
  borderRadius: 999,
  padding: "8px 14px",
  fontSize: 13,
  cursor: "pointer",
  background: "#ffffff",
  color: "#17304d",
}

const inputStyle: CSSProperties = {
  border: "1px solid #cad7e6",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 13,
  background: "#ffffff",
  color: "#17304d",
}

const hintCardStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #d9e3ef",
  background: "rgba(255, 255, 255, 0.82)",
}

const filterSummaryStyle: CSSProperties = {
  marginTop: 12,
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  fontSize: 12,
  color: "#4a5d75",
}

const filterTagStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(255, 255, 255, 0.88)",
  border: "1px solid #cad7e6",
}

const pinnedViewStyle: CSSProperties = {
  background: "linear-gradient(180deg, #fff7e8 0%, #ffffff 100%)",
  borderColor: "#f2c078",
  boxShadow: "0 8px 18px rgba(180, 83, 9, 0.08)",
}

const SAVED_VIEWS_KEY = "artstore_reports_saved_views"
const REPORTS_GUIDANCE_KEY = "artstore_reports_guidance_open"

async function api<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
  })

  const data = (await response.json().catch(() => ({}))) as T & {
    message?: string
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`)
  }

  return data
}

function formatDateLabel(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat("en-AU", {
    month: "short",
    day: "numeric",
  }).format(date)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function toInputDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

function buildReportPath(params: { days?: number; start?: string; end?: string }) {
  const search = new URLSearchParams()

  if (params.start && params.end) {
    search.set("start", params.start)
    search.set("end", params.end)
  } else if (params.days) {
    search.set("days", String(params.days))
  }

  return search.toString()
}

function buildDrilldownPath(path: string, params: { days?: number; start?: string; end?: string; status?: string }) {
  const search = new URLSearchParams(buildReportPath(params))
  if (params.status) {
    search.set("status", params.status)
  }
  return `${path}?${search.toString()}`
}

function buildDayDrilldownPath(date: string) {
  const search = new URLSearchParams()
  search.set("start", date)
  search.set("end", date)
  return `/app/reports-orders?${search.toString()}`
}

function syncReportsUrl(params: Record<string, string | number | undefined>) {
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

function HintBadge(props: { text: string }) {
  return (
    <span
      title={props.text}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        borderRadius: 999,
        background: "#e8f0fb",
        color: "#173f8a",
        fontSize: 11,
        fontWeight: 700,
        cursor: "help",
      }}
    >
      i
    </span>
  )
}

function ExplainCard(props: { title: string; body: string }) {
  return (
    <div style={hintCardStyle}>
      <HintBadge text={props.body} />
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#17304d" }}>{props.title}</div>
        <div style={{ fontSize: 12, color: "#607086", lineHeight: 1.5 }}>{props.body}</div>
      </div>
    </div>
  )
}

function EmptyGuide(props: { title: string; body: string }) {
  return (
    <div
      style={{
        ...panelStyle,
        borderStyle: "dashed",
        textAlign: "center",
        color: "#4a5d75",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, color: "#17304d" }}>{props.title}</div>
      <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>{props.body}</div>
    </div>
  )
}

function SkeletonBlock(props: {
  width?: string | number
  height: number
  radius?: number
}) {
  return (
    <div
      className="report-skeleton"
      aria-hidden="true"
      style={{
        width: props.width ?? "100%",
        height: props.height,
        borderRadius: props.radius ?? 10,
        background: "linear-gradient(90deg, #eef3f8 0%, #f7faff 50%, #eef3f8 100%)",
        backgroundSize: "200% 100%",
        opacity: 0.95,
      }}
    />
  )
}

function MetricCardSkeleton() {
  return (
    <div style={statCardStyle} aria-hidden="true">
      <SkeletonBlock width="44%" height={12} radius={999} />
      <div style={{ marginTop: 12 }}>
        <SkeletonBlock width="58%" height={28} radius={8} />
      </div>
      <div style={{ marginTop: 12 }}>
        <SkeletonBlock width="78%" height={12} radius={999} />
      </div>
      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 8 }}>
        <SkeletonBlock width="34%" height={12} radius={999} />
        <SkeletonBlock width="26%" height={12} radius={999} />
      </div>
    </div>
  )
}

function ChartSkeleton(props: { rows?: number }) {
  const rows = props.rows ?? 4

  return (
    <div style={{ display: "grid", gap: 12 }} aria-hidden="true">
      <SkeletonBlock height={220} radius={16} />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(rows, 6)}, minmax(0, 1fr))`, gap: 8 }}>
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonBlock key={index} height={12} radius={999} />
        ))}
      </div>
    </div>
  )
}

function BarsSkeleton(props: { rows?: number }) {
  const rows = props.rows ?? 5

  return (
    <div style={{ display: "grid", gap: 14 }} aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <SkeletonBlock width="40%" height={12} radius={999} />
            <SkeletonBlock width="20%" height={12} radius={999} />
          </div>
          <SkeletonBlock height={10} radius={999} />
          <SkeletonBlock width="52%" height={11} radius={999} />
        </div>
      ))}
    </div>
  )
}

function DonutSkeleton() {
  return (
    <div style={{ display: "grid", gap: 14, alignItems: "center" }} aria-hidden="true">
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: "50%",
          justifySelf: "center",
          background:
            "radial-gradient(circle at center, #ffffff 0 36px, #eef3f8 37px 60px, transparent 61px), linear-gradient(90deg, #eef3f8 0%, #f7faff 50%, #eef3f8 100%)",
        }}
      />
      <div style={{ display: "grid", gap: 8 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <SkeletonBlock width="44%" height={12} radius={999} />
            <SkeletonBlock width="18%" height={12} radius={999} />
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionTitle(props: { eyebrow: string; title: string; subtitle: string; hint?: string }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <span style={labelStyle}>{props.eyebrow}</span>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#132238", display: "flex", alignItems: "center", gap: 8 }}>
        <span>{props.title}</span>
        {props.hint ? <HintBadge text={props.hint} /> : null}
      </div>
      <div style={{ fontSize: 13, color: "#607086" }}>{props.subtitle}</div>
    </div>
  )
}

function MetricCard(props: {
  label: string
  value: string
  helper: string
  hint?: string
  href?: string
  active?: boolean
  onClick?: () => void
}) {
  const content = (
    <div
      style={{
        ...(props.href || props.onClick ? interactiveCardStyle : statCardStyle),
        borderColor: props.active ? "#7fa7e6" : undefined,
        boxShadow: props.active ? "0 16px 32px rgba(23, 42, 79, 0.10)" : undefined,
      }}
    >
      <div style={labelStyle}>{props.label}</div>
      {props.hint ? (
        <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end" }}>
          <HintBadge text={props.hint} />
        </div>
      ) : null}
      <div style={{ ...valueStyle, marginTop: 8 }}>{props.value}</div>
      <div style={{ marginTop: 8, fontSize: 13, color: "#607086" }}>{props.helper}</div>
      {props.href || props.onClick ? (
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 8 }}>
          <div style={{ fontSize: 12, color: "#173f8a", fontWeight: 600 }}>
            {props.onClick ? "Apply focus" : "View detail ->"}
          </div>
          {props.href ? (
            <a
              href={props.href}
              onClick={(event) => event.stopPropagation()}
              style={{ fontSize: 12, color: "#173f8a", fontWeight: 700, textDecoration: "none" }}
            >
              Detail ->
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  )

  if (props.onClick || props.href) {
    return (
      <div
        onClick={props.onClick}
        role={props.onClick ? "button" : undefined}
        tabIndex={props.onClick ? 0 : undefined}
        onKeyDown={(event) => {
          if (props.onClick && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault()
            props.onClick()
          }
        }}
        style={{ textDecoration: "none", padding: 0, textAlign: "inherit", cursor: "pointer" }}
        onMouseEnter={(event) => {
          const node = event.currentTarget.firstElementChild as HTMLElement | null
          if (node) {
            node.style.transform = "translateY(-2px)"
            node.style.boxShadow = "0 16px 32px rgba(23, 42, 79, 0.10)"
            node.style.borderColor = "#9db8ea"
          }
        }}
        onMouseLeave={(event) => {
          const node = event.currentTarget.firstElementChild as HTMLElement | null
          if (node) {
            node.style.transform = ""
            node.style.boxShadow = props.active
              ? "0 16px 32px rgba(23, 42, 79, 0.10)"
              : (interactiveCardStyle.boxShadow as string)
            node.style.borderColor = props.active ? "#7fa7e6" : "#d9e3ef"
          }
        }}
      >
        {content}
      </div>
    )
  }

  return content
}

function LineChart(props: {
  data: Array<{ date: string; sales: number; orders: number }>
  pointHref?: (date: string) => string
}) {
  if (!props.data.length) {
    return <div style={{ fontSize: 14, color: "#607086" }}>No sales data in selected range.</div>
  }

  const width = 680
  const height = 240
  const padding = 24
  const maxValue = Math.max(...props.data.map((item) => item.sales), 1)

  const points = props.data.map((item, index) => {
    const x =
      props.data.length <= 1
        ? width / 2
        : padding + (index * (width - padding * 2)) / (props.data.length - 1)
    const y = height - padding - (item.sales / maxValue) * (height - padding * 2)
    return { x, y, item }
  })

  const line = points.map((point) => `${point.x},${point.y}`).join(" ")

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f7cf6" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#2f7cf6" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = padding + (height - padding * 2) * tick
          return (
            <line
              key={tick}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              stroke="#e8eef5"
              strokeWidth="1"
            />
          )
        })}
        {points.length > 1 ? (
          <polygon
            points={`${points[0].x},${height - padding} ${line} ${points[points.length - 1].x},${height - padding}`}
            fill="url(#salesFill)"
          />
        ) : null}
        <polyline
          fill="none"
          stroke="#2f7cf6"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={line}
        />
        {points.map((point) =>
          props.pointHref ? (
            <a key={point.item.date} href={props.pointHref(point.item.date)}>
              <circle cx={point.x} cy={point.y} r="6" fill="transparent" />
              <circle cx={point.x} cy={point.y} r="4" fill="#173f8a" />
            </a>
          ) : (
            <circle key={point.item.date} cx={point.x} cy={point.y} r="4" fill="#173f8a" />
          )
        )}
      </svg>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(points.length, 6)}, minmax(0, 1fr))`,
          gap: 8,
        }}
      >
        {points
          .filter((_, index) => {
            if (points.length <= 6) {
              return true
            }

            const step = Math.ceil(points.length / 6)
            return index % step === 0 || index === points.length - 1
          })
          .map((point) =>
            props.pointHref ? (
              <a
                key={point.item.date}
                href={props.pointHref(point.item.date)}
                style={{ fontSize: 12, color: "#173f8a", textDecoration: "none", fontWeight: 600 }}
              >
                {formatDateLabel(point.item.date)}
              </a>
            ) : (
              <div key={point.item.date} style={{ fontSize: 12, color: "#607086" }}>
                {formatDateLabel(point.item.date)}
              </div>
            )
          )}
      </div>
    </div>
  )
}

function HorizontalBars(props: {
  items: Array<{ label: string; value: number; helper?: string; href?: string }>
  color: string
  valueFormatter?: (value: number) => string
}) {
  const max = Math.max(...props.items.map((item) => item.value), 1)

  if (!props.items.length) {
    return <div style={{ fontSize: 14, color: "#607086" }}>No data in selected range.</div>
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {props.items.map((item) => (
        <div key={item.label} style={{ display: "grid", gap: 6 }}>
          {item.href ? (
            <a
              href={item.href}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ fontSize: 13, color: "#23364e", fontWeight: 600 }}>{item.label}</div>
              <div style={{ fontSize: 13, color: "#607086" }}>
                {props.valueFormatter ? props.valueFormatter(item.value) : formatNumber(item.value)}
              </div>
            </a>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontSize: 13, color: "#23364e", fontWeight: 600 }}>{item.label}</div>
              <div style={{ fontSize: 13, color: "#607086" }}>
                {props.valueFormatter ? props.valueFormatter(item.value) : formatNumber(item.value)}
              </div>
            </div>
          )}
          <div
            style={{
              height: 10,
              background: "#edf2f8",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.max((item.value / max) * 100, item.value > 0 ? 8 : 0)}%`,
                height: "100%",
                borderRadius: 999,
                background: props.color,
              }}
            />
          </div>
          {item.helper ? (
            <div style={{ fontSize: 12, color: "#708197" }}>{item.helper}</div>
          ) : null}
          {item.href ? (
            <div style={{ fontSize: 11, color: "#173f8a", fontWeight: 600 }}>Open detail -></div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function DonutChart(props: {
  items: Array<{ label: string; value: number; color: string; href?: string }>
}) {
  const total = props.items.reduce((sum, item) => sum + item.value, 0)
  let current = 0

  return (
    <div style={{ display: "grid", gap: 14, alignItems: "center" }}>
      <svg viewBox="0 0 120 120" style={{ width: 180, height: 180, justifySelf: "center" }}>
        <circle cx="60" cy="60" r="42" fill="none" stroke="#edf2f8" strokeWidth="16" />
        {props.items.map((item) => {
          const portion = total > 0 ? item.value / total : 0
          const length = portion * 2 * Math.PI * 42
          const offset = 2 * Math.PI * 42 - current
          current += length

          const circle = (
            <circle
              key={item.label}
              cx="60"
              cy="60"
              r="42"
              fill="none"
              stroke={item.color}
              strokeWidth="16"
              strokeDasharray={`${length} ${2 * Math.PI * 42}`}
              strokeDashoffset={offset}
              transform="rotate(-90 60 60)"
              strokeLinecap="butt"
            />
          )

          return item.href ? (
            <a key={item.label} href={item.href}>
              {circle}
            </a>
          ) : (
            circle
          )
        })}
        <text x="60" y="56" textAnchor="middle" fontSize="12" fill="#607086">
          Open CRM
        </text>
        <text x="60" y="72" textAnchor="middle" fontSize="18" fontWeight="700" fill="#132238">
          {formatNumber(total)}
        </text>
      </svg>
      <div style={{ display: "grid", gap: 8 }}>
        {props.items.map((item) => (
          <div key={item.label} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            {item.href ? (
              <a
                href={item.href}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  flex: 1,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#23364e", fontSize: 13 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: item.color,
                      display: "inline-block",
                    }}
                  />
                  {item.label}
                </div>
                <div style={{ fontSize: 13, color: "#607086" }}>{formatNumber(item.value)}</div>
              </a>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#23364e", fontSize: 13 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: item.color,
                      display: "inline-block",
                    }}
                  />
                  {item.label}
                </div>
                <div style={{ fontSize: 13, color: "#607086" }}>{formatNumber(item.value)}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const ReportsPage = () => {
  const [dashboardView, setDashboardView] = useState<"overview" | "sales" | "crm" | "operations">("overview")
  const [days, setDays] = useState(30)
  const [mode, setMode] = useState<"preset" | "custom">("preset")
  const [startDate, setStartDate] = useState(() => {
    const end = new Date()
    const start = new Date(end)
    start.setDate(end.getDate() - 29)
    return toInputDate(start)
  })
  const [endDate, setEndDate] = useState(() => toInputDate(new Date()))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [report, setReport] = useState<ReportResponse | null>(null)
  const [notice, setNotice] = useState<NoticeState | null>(null)
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [savedViewQuery, setSavedViewQuery] = useState("")
  const [lastUpdatedAt, setLastUpdatedAt] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [showExplainCards, setShowExplainCards] = useState(true)

  const showNotice = (message: string, tone: NoticeState["tone"] = "info") => {
    setNotice({ message, tone })
    window.setTimeout(() => setNotice(null), 1800)
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SAVED_VIEWS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as SavedView[]
        if (Array.isArray(parsed)) {
          setSavedViews(parsed.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))))
        }
      }
    } catch {
      // Ignore malformed local storage values.
    }

    try {
      const raw = window.localStorage.getItem(REPORTS_GUIDANCE_KEY)
      if (raw === "0") {
        setShowExplainCards(false)
      }
    } catch {
      // Ignore malformed local storage values.
    }

    const params = new URLSearchParams(window.location.search)
    const nextView = params.get("view")
    const nextMode = params.get("mode")
    const nextDays = Number(params.get("days") || "30")
    const nextStart = params.get("start")
    const nextEnd = params.get("end")

    if (
      nextView === "overview" ||
      nextView === "sales" ||
      nextView === "crm" ||
      nextView === "operations"
    ) {
      setDashboardView(nextView)
    }

    if (nextMode === "preset" || nextMode === "custom") {
      setMode(nextMode)
    }

    if (Number.isFinite(nextDays) && nextDays > 0) {
      setDays(nextDays)
    }

    if (nextStart) {
      setStartDate(nextStart)
    }

    if (nextEnd) {
      setEndDate(nextEnd)
    }
  }, [])

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError("")

      if (mode === "custom" && (!startDate || !endDate || startDate > endDate)) {
        setLoading(false)
        setError("Please provide a valid date range.")
        return
      }

      try {
        const query = buildReportPath(
          mode === "custom"
            ? { start: startDate, end: endDate }
            : { days }
        )
        const data = await api<ReportResponse>(`/admin/reports/summary?${query}`)
        if (active) {
          setReport(data)
          setLastUpdatedAt(new Date().toISOString())
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load report")
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [days, mode, startDate, endDate, refreshKey])

  const exportHref = useMemo(() => {
    const params =
      mode === "custom"
        ? { start: startDate, end: endDate }
        : { days }
    const query = buildReportPath(params)

    return `/admin/reports/export?${query}`
  }, [days, mode, startDate, endDate])

  useEffect(() => {
    syncReportsUrl({
      view: dashboardView,
      mode,
      days: mode === "preset" ? days : undefined,
      start: mode === "custom" ? startDate : undefined,
      end: mode === "custom" ? endDate : undefined,
    })
  }, [dashboardView, mode, days, startDate, endDate])

  useEffect(() => {
    window.localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(savedViews))
  }, [savedViews])

  useEffect(() => {
    window.localStorage.setItem(REPORTS_GUIDANCE_KEY, showExplainCards ? "1" : "0")
  }, [showExplainCards])

  const reportParams = useMemo(
    () => (mode === "custom" ? { start: startDate, end: endDate } : { days }),
    [days, mode, startDate, endDate]
  )

  const productBars = useMemo(() => {
    return (report?.top_products ?? []).map((item) => ({
      label: item.title,
      value: item.sales,
      helper: `${formatNumber(item.quantity)} sold across ${formatNumber(item.orders)} line items`,
      href: `${buildDrilldownPath("/app/reports-products", reportParams)}&q=${encodeURIComponent(item.title)}`,
    }))
  }, [report, reportParams])

  const leadBars = useMemo(() => {
    const rows = report?.crm.lead_status ?? {}
    return [
      { label: "New", value: rows.new ?? 0, href: "/app/reports-crm-leads?status=new" },
      { label: "Contacted", value: rows.contacted ?? 0, href: "/app/reports-crm-leads?status=contacted" },
      { label: "Qualified", value: rows.qualified ?? 0, href: "/app/reports-crm-leads?status=qualified" },
      { label: "Lost", value: rows.lost ?? 0, href: "/app/reports-crm-leads?status=lost" },
    ]
  }, [report])

  const opportunityBars = useMemo(() => {
    const rows = report?.crm.opportunity_stage ?? {}
    return [
      { label: "Prospecting", value: rows.prospecting ?? 0, href: "/app/reports-crm-opportunities?stage=prospecting" },
      { label: "Negotiation", value: rows.negotiation ?? 0, href: "/app/reports-crm-opportunities?stage=negotiation" },
      { label: "Closed Won", value: rows.closed_won ?? 0, href: "/app/reports-crm-opportunities?stage=closed_won" },
      { label: "Closed Lost", value: rows.closed_lost ?? 0, href: "/app/reports-crm-opportunities?stage=closed_lost" },
    ]
  }, [report])

  const taskDonut = useMemo(() => {
    const rows = report?.crm.task_status ?? {}
    return [
      { label: "Open", value: rows.open ?? 0, color: "#2563eb", href: "/app/reports-crm-tasks?status=open" },
      { label: "In Progress", value: rows.in_progress ?? 0, color: "#f59e0b", href: "/app/reports-crm-tasks?status=in_progress" },
      { label: "Completed", value: rows.completed ?? 0, color: "#16a34a", href: "/app/reports-crm-tasks?status=completed" },
      { label: "Overdue", value: rows.overdue ?? 0, color: "#dc2626", href: "/app/reports-crm-tasks?status=overdue" },
    ]
  }, [report])

  const copyCurrentLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      showNotice("Link copied", "success")
    } catch {
      showNotice("Copy failed", "error")
    }
  }

  const saveCurrentView = () => {
    const name = window.prompt("Saved view name")
    if (!name?.trim()) {
      return
    }

    const next: SavedView = {
      id: `${Date.now()}`,
      name: name.trim(),
      pinned: false,
      dashboardView,
      mode,
      days,
      startDate,
      endDate,
    }

    setSavedViews((current) =>
      [next, ...current]
        .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
        .slice(0, 8)
    )
    showNotice("View saved", "success")
  }

  const applySavedView = (view: SavedView) => {
    setDashboardView(view.dashboardView)
    setMode(view.mode)
    setDays(view.days)
    setStartDate(view.startDate)
    setEndDate(view.endDate)
  }

  const deleteSavedView = (id: string) => {
    const target = savedViews.find((view) => view.id === id)
    if (!target) {
      return
    }

    if (!window.confirm(`Delete saved view "${target.name}"?`)) {
      return
    }

    setSavedViews((current) => current.filter((view) => view.id !== id))
    showNotice("View deleted", "success")
  }

  const renameSavedView = (id: string) => {
    const target = savedViews.find((view) => view.id === id)
    if (!target) {
      return
    }

    const name = window.prompt("Rename saved view", target.name)
    if (!name?.trim()) {
      return
    }

    setSavedViews((current) =>
      current.map((view) => (view.id === id ? { ...view, name: name.trim() } : view))
    )
    showNotice("View renamed", "success")
  }

  const togglePinSavedView = (id: string) => {
    const target = savedViews.find((view) => view.id === id)
    setSavedViews((current) =>
      current
        .map((view) => (view.id === id ? { ...view, pinned: !view.pinned } : view))
        .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
    )
    if (target) {
      showNotice(target.pinned ? "View unpinned" : "View pinned", "info")
    }
  }

  const filterSummary = useMemo(() => {
    const modeLabel =
      mode === "preset"
        ? `Range: last ${days} days`
        : `Range: ${startDate || "--"} to ${endDate || "--"}`

    const viewLabel =
      dashboardView === "overview"
        ? "Focus: overview"
        : dashboardView === "sales"
          ? "Focus: sales"
          : dashboardView === "crm"
            ? "Focus: CRM"
            : "Focus: operations"

    const savedLabel = savedViews.length ? `Saved views: ${savedViews.length}` : "Saved views: none"
    const pinnedLabel = savedViews.some((view) => view.pinned)
      ? `Pinned: ${savedViews.filter((view) => view.pinned).length}`
      : "Pinned: none"

    const updatedLabel = lastUpdatedAt
      ? `Updated: ${new Intl.DateTimeFormat("en-AU", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(lastUpdatedAt))}`
      : "Updated: loading"

    return [modeLabel, viewLabel, savedLabel, pinnedLabel, updatedLabel]
  }, [mode, days, startDate, endDate, dashboardView, savedViews, lastUpdatedAt])

  const visibleSavedViews = useMemo(() => {
    const q = savedViewQuery.trim().toLowerCase()
    if (!q) {
      return savedViews
    }

    return savedViews.filter((view) => view.name.toLowerCase().includes(q))
  }, [savedViews, savedViewQuery])

  const refreshReport = () => {
    setRefreshKey((value) => value + 1)
    showNotice("Refreshing...", "info")
  }

  const groupedSavedViews = useMemo(() => {
    return {
      pinned: visibleSavedViews.filter((view) => view.pinned),
      others: visibleSavedViews.filter((view) => !view.pinned),
    }
  }, [visibleSavedViews])

  const hasDashboardData = useMemo(() => {
    if (!report) {
      return false
    }

    return (
      report.summary.orders_count > 0 ||
      report.top_products.length > 0 ||
      Object.values(report.crm.lead_status).some((value) => value > 0) ||
      Object.values(report.crm.opportunity_stage).some((value) => value > 0) ||
      Object.values(report.crm.task_status).some((value) => value > 0)
    )
  }, [report])

  return (
    <div style={pageStyle}>
      <style>
        {`
          @keyframes reportSkeletonShimmer {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }

          .report-skeleton {
            animation: reportSkeletonShimmer 1.4s linear infinite;
          }
        `}
      </style>
      <div style={heroStyle}>
        <ReportHeader
          title="Sales + CRM dashboard"
          subtitle="A practical first pass for revenue trend, top-selling products, and CRM funnel visibility."
          crumbs={[
            { label: "Reports" },
          ]}
          aside={
          <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setMode("preset")}
                style={{
                  ...buttonBaseStyle,
                  background: mode === "preset" ? "#173f8a" : "#ffffff",
                  color: mode === "preset" ? "#ffffff" : "#17304d",
                  borderColor: mode === "preset" ? "#173f8a" : "#cad7e6",
                }}
              >
                Preset
              </button>
              <button
                type="button"
                onClick={() => setMode("custom")}
                style={{
                  ...buttonBaseStyle,
                  background: mode === "custom" ? "#173f8a" : "#ffffff",
                  color: mode === "custom" ? "#ffffff" : "#17304d",
                  borderColor: mode === "custom" ? "#173f8a" : "#cad7e6",
                }}
              >
                Custom
              </button>
            </div>
            {mode === "preset" ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {[7, 30, 90].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDays(value)}
                    style={{
                      ...buttonBaseStyle,
                      background: days === value ? "#173f8a" : "#ffffff",
                      color: days === value ? "#ffffff" : "#17304d",
                      borderColor: days === value ? "#173f8a" : "#cad7e6",
                    }}
                  >
                    Last {value} days
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  style={inputStyle}
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  style={inputStyle}
                />
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <a href={exportHref} style={{ ...buttonBaseStyle, textDecoration: "none" }}>
                Export CSV
              </a>
              <button type="button" onClick={saveCurrentView} style={buttonBaseStyle}>
                Save View
              </button>
              <button type="button" onClick={copyCurrentLink} style={buttonBaseStyle}>
                Copy Report Link
              </button>
              <button type="button" onClick={refreshReport} style={buttonBaseStyle} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </button>
              <a href="/app/orders" style={{ ...buttonBaseStyle, textDecoration: "none" }}>
                Open Orders
              </a>
              <a href="/app/customers" style={{ ...buttonBaseStyle, textDecoration: "none" }}>
                Open Customers
              </a>
            </div>
          </div>
          }
        />
        <div style={{ marginTop: 12, fontSize: 13, color: "#5b6b82" }}>
          {report
            ? `${formatDateLabel(report.range.start)} to ${formatDateLabel(report.range.end)}`
            : "Loading report range..."}
        </div>
        {notice ? (
          <div style={{ marginTop: 8, fontSize: 12, color: "#173f8a", fontWeight: 600 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 999,
                background:
                  notice.tone === "success"
                    ? "#e8f7ec"
                    : notice.tone === "error"
                      ? "#fdecec"
                      : "#e8f0fb",
                color:
                  notice.tone === "success"
                    ? "#166534"
                    : notice.tone === "error"
                      ? "#b42318"
                      : "#173f8a",
                border:
                  notice.tone === "success"
                    ? "1px solid #b7e0c2"
                    : notice.tone === "error"
                      ? "1px solid #f2c7c7"
                      : "1px solid #c6d7f4",
              }}
            >
              {notice.message}
            </span>
          </div>
        ) : null}
        {savedViews.length ? (
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={savedViewQuery}
                onChange={(event) => setSavedViewQuery(event.target.value)}
                placeholder="Filter saved views"
                style={{ ...inputStyle, minWidth: 220 }}
              />
              <span style={{ fontSize: 12, color: "#607086" }}>
                Showing {visibleSavedViews.length} of {savedViews.length}
              </span>
            </div>
            {groupedSavedViews.pinned.length ? (
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, color: "#b45309", fontWeight: 700 }}>Pinned</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {groupedSavedViews.pinned.map((view) => (
                  <div
                    key={view.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 10px",
                      background: "#ffffff",
                      border: "1px solid #cad7e6",
                      borderRadius: 999,
                      ...(view.pinned ? pinnedViewStyle : null),
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#b45309", fontWeight: 700 }}>Pinned</span>
                    <button type="button" onClick={() => applySavedView(view)} style={{ border: "none", background: "transparent", color: "#173f8a", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                      {view.name}
                    </button>
                    <button type="button" onClick={() => renameSavedView(view.id)} style={{ border: "none", background: "transparent", color: "#607086", cursor: "pointer", fontSize: 12 }}>
                      rename
                    </button>
                    <button type="button" onClick={() => togglePinSavedView(view.id)} style={{ border: "none", background: "transparent", color: "#b45309", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                      unpin
                    </button>
                    <button type="button" onClick={() => deleteSavedView(view.id)} style={{ border: "none", background: "transparent", color: "#9b1c1c", cursor: "pointer", fontSize: 12 }}>
                      x
                    </button>
                  </div>
                ))}
                </div>
              </div>
            ) : null}
            {groupedSavedViews.others.length ? (
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, color: "#607086", fontWeight: 700 }}>Others</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {groupedSavedViews.others.map((view) => (
              <div
                key={view.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  background: "#ffffff",
                  border: "1px solid #cad7e6",
                  borderRadius: 999,
                  ...(view.pinned ? pinnedViewStyle : null),
                }}
              >
                {view.pinned ? (
                  <span style={{ fontSize: 12, color: "#b45309", fontWeight: 700 }}>Pinned</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => applySavedView(view)}
                  style={{ border: "none", background: "transparent", color: "#173f8a", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                >
                  {view.name}
                </button>
                <button
                  type="button"
                  onClick={() => renameSavedView(view.id)}
                  style={{ border: "none", background: "transparent", color: "#607086", cursor: "pointer", fontSize: 12 }}
                >
                  rename
                </button>
                <button
                  type="button"
                  onClick={() => togglePinSavedView(view.id)}
                  style={{ border: "none", background: "transparent", color: view.pinned ? "#b45309" : "#607086", cursor: "pointer", fontSize: 12, fontWeight: view.pinned ? 700 : 400 }}
                >
                  {view.pinned ? "unpin" : "pin"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteSavedView(view.id)}
                  style={{ border: "none", background: "transparent", color: "#9b1c1c", cursor: "pointer", fontSize: 12 }}
                >
                  x
                </button>
              </div>
            ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            ["overview", "Overview"],
            ["sales", "Sales"],
            ["crm", "CRM"],
            ["operations", "Operations"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setDashboardView(value as "overview" | "sales" | "crm" | "operations")
              }
              style={{
                ...buttonBaseStyle,
                background: dashboardView === value ? "#173f8a" : "#ffffff",
                color: dashboardView === value ? "#ffffff" : "#17304d",
                borderColor: dashboardView === value ? "#173f8a" : "#cad7e6",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={filterSummaryStyle}>
          {filterSummary.map((item) => (
            <span key={item} style={filterTagStyle}>
              {item}
            </span>
          ))}
        </div>
      </div>

      <div style={{ ...panelStyle, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#17304d" }}>Dashboard guidance</div>
            <div style={{ fontSize: 12, color: "#607086" }}>
              Definitions and drill-down context for the sales, CRM, and operations cards.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowExplainCards((value) => !value)}
            style={buttonBaseStyle}
          >
            {showExplainCards ? "Hide guidance" : "Show guidance"}
          </button>
        </div>
        {showExplainCards ? (
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <ExplainCard
              title="Sales cards"
              body="Gross sales tracks non-canceled order value. Net sales subtracts refunded amounts, while canceled demand stays separated in operations."
            />
            <ExplainCard
              title="CRM pipeline"
              body="Pipeline amount comes from currently open opportunities. Closed won shows already-converted deal value, not forecast."
            />
            <ExplainCard
              title="Drill-down behavior"
              body="Clicking a KPI changes dashboard focus. Detail links and chart items open filtered order, product, lead, opportunity, or task pages."
            />
            <ExplainCard
              title="Metric source"
              body="Sales cards are based on report aggregation for the current range. CRM cards reflect current lead, opportunity, and task states rather than historical cohorts."
            />
          </div>
        ) : null}
      </div>

      {error ? (
        <div
          style={{
            ...panelStyle,
            color: "#b42318",
            borderColor: "#f0c7c2",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span>{error}</span>
          <button type="button" onClick={refreshReport} style={buttonBaseStyle} disabled={loading}>
            {loading ? "Refreshing..." : "Retry"}
          </button>
        </div>
      ) : null}

      {!loading && !error && !hasDashboardData ? (
        <EmptyGuide
          title="No report data in this range"
          body="Try expanding the date range, switching back to a preset window, or creating a few orders and CRM records so the dashboard has sales and pipeline activity to show."
        />
      ) : null}

      <div style={cardGridStyle}>
        {loading && !report ? (
          Array.from({ length: 7 }).map((_, index) => <MetricCardSkeleton key={index} />)
        ) : (
          <>
            <MetricCard
              label="Gross Sales"
              value={report?.summary.total_sales_display ?? "--"}
              helper={`${formatNumber(report?.summary.orders_count ?? 0)} non-canceled orders`}
              hint="Aggregated from non-canceled orders inside the current report range."
              href={buildDrilldownPath("/app/reports-orders", reportParams)}
              onClick={() => setDashboardView("sales")}
              active={dashboardView === "sales"}
            />
            <MetricCard
              label="Net Sales"
              value={report?.summary.net_sales_display ?? "--"}
              helper={`${formatNumber(report?.summary.refunded_orders ?? 0)} refunded orders, ${formatNumber(report?.summary.partial_refund_orders ?? 0)} partial`}
              hint="Gross sales minus refunded totals in the same date range."
              href={buildDrilldownPath("/app/reports-orders", { ...reportParams, status: "refunded" })}
              onClick={() => setDashboardView("sales")}
              active={dashboardView === "sales"}
            />
            <MetricCard
              label="Refunded"
              value={report?.summary.refunded_total_display ?? "--"}
              helper={`${formatNumber(report?.summary.full_refund_orders ?? 0)} full refunds`}
              hint="Includes both full and partial refunds recorded on matching orders."
              href={buildDrilldownPath("/app/reports-orders", { ...reportParams, status: "refunded" })}
              onClick={() => setDashboardView("sales")}
              active={dashboardView === "sales"}
            />
            <MetricCard
              label="Canceled Orders"
              value={formatNumber(report?.summary.canceled_orders ?? 0)}
              helper={report?.summary.canceled_sales_display ?? "--"}
              hint="Canceled demand is shown separately so operations issues do not distort active sales."
              href={buildDrilldownPath("/app/reports-orders", { ...reportParams, status: "canceled" })}
              onClick={() => setDashboardView("operations")}
              active={dashboardView === "operations"}
            />
            <MetricCard
              label="Average Order"
              value={report?.summary.avg_order_value_display ?? "--"}
              helper={`${formatNumber(report?.summary.active_customers ?? 0)} active buyers`}
              hint="Average order value is based on non-canceled orders in the selected range."
              href={buildDrilldownPath("/app/reports-orders", { ...reportParams, status: "active" })}
              onClick={() => setDashboardView("sales")}
              active={dashboardView === "sales"}
            />
            <MetricCard
              label="New Customers"
              value={formatNumber(report?.summary.new_customers ?? 0)}
              helper="Customers created in selected range"
              hint="This is customer creation volume, not necessarily first purchase conversion."
              href="/app/customers"
              onClick={() => setDashboardView("sales")}
              active={dashboardView === "sales"}
            />
            <MetricCard
              label="Open Tasks"
              value={formatNumber(report?.summary.open_tasks ?? 0)}
              helper={`${formatPercent(report?.crm.conversion_rate ?? 0)} lead qualification rate`}
              hint="Open tasks reflect current CRM workload state, not historical task creation."
              href="/app/reports-crm-tasks?status=open"
              onClick={() => setDashboardView("operations")}
              active={dashboardView === "operations"}
            />
          </>
        )}
      </div>

      {dashboardView !== "crm" && (
      <div style={sectionGridStyle}>
        <div style={panelStyle}>
          <SectionTitle
            eyebrow="Sales"
            title="Revenue trend"
            subtitle="Daily sales trend excluding canceled orders."
            hint="Each point opens that day in order drill-down so you can inspect spikes, refunds, and slower days."
          />
          <div style={{ marginTop: 16 }}>
            {loading ? (
              <ChartSkeleton rows={6} />
            ) : (
              <LineChart
                data={report?.sales_trend ?? []}
                pointHref={(date) => buildDayDrilldownPath(date)}
              />
            )}
          </div>
        </div>

        <div style={panelStyle}>
          <SectionTitle
            eyebrow="Pipeline"
            title="CRM snapshot"
            subtitle="Open pipeline value and closed-won amount from current CRM records."
            hint="Pipeline and won cards are based on current opportunity stages, so use them as live operational numbers rather than booked finance totals."
          />
          <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
            {loading ? (
              <>
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </>
            ) : (
              <>
                <MetricCard
                  label="Pipeline Amount"
                  value={report?.summary.pipeline_amount_display ?? "--"}
                  helper={`${formatNumber(report?.summary.total_opportunities ?? 0)} opportunities`}
                  href="/app/reports-crm-opportunities"
                  onClick={() => setDashboardView("crm")}
                  active={dashboardView === "crm"}
                />
                <MetricCard
                  label="Closed Won"
                  value={report?.summary.won_amount_display ?? "--"}
                  helper={`${formatNumber(report?.summary.total_leads ?? 0)} tracked leads`}
                  href="/app/reports-crm-leads?status=qualified"
                  onClick={() => setDashboardView("crm")}
                  active={dashboardView === "crm"}
                />
              </>
            )}
          </div>
        </div>
      </div>
      )}

      {dashboardView !== "crm" && (
      <div style={sectionGridStyle}>
        <div style={panelStyle}>
          <SectionTitle
            eyebrow="Top Products"
            title="Best sellers"
            subtitle="Ranked by sales contribution from non-canceled order line items."
            hint="This ranking helps merchandising and replenishment. Clicking a bar opens product sales detail filtered to that product title."
          />
          <div style={{ marginTop: 16 }}>
            {loading ? (
              <BarsSkeleton rows={5} />
            ) : (
              <HorizontalBars
                items={productBars}
                color="linear-gradient(90deg, #173f8a, #2f7cf6)"
                valueFormatter={(value) =>
                  new Intl.NumberFormat("en-AU", {
                    style: "currency",
                    currency: (report?.currency_code || "AUD").toUpperCase(),
                    maximumFractionDigits: 0,
                  }).format(value)
                }
              />
            )}
          </div>
        </div>

        <div style={panelStyle}>
          <SectionTitle
            eyebrow="Tasks"
            title="Task health"
            subtitle="Open, in-progress, completed, and overdue workload."
            hint="Overdue is derived from due date plus unfinished status, which makes it useful for spotting execution lag."
          />
          <div style={{ marginTop: 16 }}>
            {loading ? (
              <DonutSkeleton />
            ) : (
              <DonutChart items={taskDonut} />
            )}
          </div>
        </div>
      </div>
      )}

      {dashboardView !== "sales" && (
      <div style={sectionGridStyle}>
        <div style={panelStyle}>
          <SectionTitle
            eyebrow="Leads"
            title="Lead funnel"
            subtitle="Current lead stage distribution from the CRM module."
            hint="Use the lead funnel to see where volume stalls before qualification. Each bar opens the matching lead list."
          />
          <div style={{ marginTop: 16 }}>
            {loading ? (
              <BarsSkeleton rows={4} />
            ) : (
              <HorizontalBars items={leadBars} color="#0f766e" />
            )}
          </div>
        </div>

        <div style={panelStyle}>
          <SectionTitle
            eyebrow="Opportunities"
            title="Deal stages"
            subtitle="Prospecting through closed-won/lost opportunity mix."
            hint="This is a live stage mix, useful for sales management and next-step planning rather than cohort conversion analysis."
          />
          <div style={{ marginTop: 16 }}>
            {loading ? (
              <BarsSkeleton rows={4} />
            ) : (
              <HorizontalBars items={opportunityBars} color="#b45309" />
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Reports",
  rank: 90,
})

export default ReportsPage
