import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useMemo, useState, type CSSProperties } from "react"
import AdminLanguageDock from "../../components/admin-language-dock"
import { useAdminLanguage } from "../../lib/admin-language"
import { adminCardStyle, adminTheme } from "../../lib/admin-theme"
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
  background: `radial-gradient(circle at top left, ${adminTheme.color.highlight} 0%, transparent 24%), linear-gradient(180deg, ${adminTheme.color.canvas} 0%, ${adminTheme.color.canvasAlt} 100%)`,
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
  color: adminTheme.color.text,
  border: `1px solid ${adminTheme.color.border}`,
  background: `linear-gradient(135deg, ${adminTheme.color.surfaceMuted} 0%, ${adminTheme.color.primarySoft} 58%, ${adminTheme.color.surface} 100%)`,
  boxShadow: adminTheme.shadow.card,
}

const cardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
}

const statCardStyle: CSSProperties = {
  ...adminCardStyle,
  borderRadius: 16,
  padding: 14,
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
  ...adminCardStyle,
  borderRadius: 18,
  padding: 16,
}

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: adminTheme.color.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
}

const valueStyle: CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
  color: adminTheme.color.text,
}

const buttonBaseStyle: CSSProperties = {
  border: `1px solid ${adminTheme.color.border}`,
  borderRadius: 999,
  padding: "8px 14px",
  fontSize: 13,
  cursor: "pointer",
  background: adminTheme.color.surface,
  color: adminTheme.color.text,
  boxShadow: adminTheme.shadow.soft,
}

const buttonActiveStyle: CSSProperties = {
  background: adminTheme.color.primary,
  color: adminTheme.color.primaryText,
  borderColor: adminTheme.color.primary,
}

const inputStyle: CSSProperties = {
  border: `1px solid ${adminTheme.color.border}`,
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 13,
  background: adminTheme.color.surface,
  color: adminTheme.color.text,
  boxShadow: adminTheme.shadow.soft,
}

const hintCardStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  padding: "12px 14px",
  borderRadius: 14,
  border: `1px solid ${adminTheme.color.border}`,
  background: "rgba(255, 253, 248, 0.86)",
}

const filterSummaryStyle: CSSProperties = {
  marginTop: 12,
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  fontSize: 12,
  color: adminTheme.color.textMuted,
}

const filterTagStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(255, 253, 248, 0.9)",
  border: `1px solid ${adminTheme.color.border}`,
}

const directoryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
}

const directoryCardStyle: CSSProperties = {
  ...adminCardStyle,
  borderRadius: 18,
  padding: 16,
  display: "grid",
  gap: 10,
  transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
}

const pinnedViewStyle: CSSProperties = {
  background: `linear-gradient(180deg, ${adminTheme.color.accentSoft} 0%, ${adminTheme.color.surface} 100%)`,
  borderColor: adminTheme.color.accent,
  boxShadow: "0 10px 22px rgba(180, 106, 60, 0.12)",
}

const viewChipStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  background: adminTheme.color.surface,
  border: `1px solid ${adminTheme.color.border}`,
  borderRadius: 999,
}

const viewActionButtonStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 12,
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
        background: adminTheme.color.primarySoft,
        color: adminTheme.color.primary,
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
        <div style={{ fontSize: 13, fontWeight: 700, color: adminTheme.color.text }}>{props.title}</div>
        <div style={{ fontSize: 12, color: adminTheme.color.textMuted, lineHeight: 1.5 }}>{props.body}</div>
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
        color: adminTheme.color.textMuted,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, color: adminTheme.color.text }}>{props.title}</div>
      <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>{props.body}</div>
    </div>
  )
}

function Monogram(props: { text: string; tone?: "primary" | "accent" }) {
  const tone = props.tone ?? "primary"
  const background = tone === "accent" ? adminTheme.color.accentSoft : adminTheme.color.primarySoft
  const color = tone === "accent" ? adminTheme.color.accent : adminTheme.color.primary

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 30,
        height: 30,
        padding: "0 8px",
        borderRadius: 999,
        background,
        color,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: "0.04em",
      }}
    >
      {props.text}
    </span>
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
        background: `linear-gradient(90deg, ${adminTheme.color.surfaceMuted} 0%, ${adminTheme.color.surface} 50%, ${adminTheme.color.surfaceMuted} 100%)`,
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
            `radial-gradient(circle at center, ${adminTheme.color.surface} 0 36px, ${adminTheme.color.surfaceMuted} 37px 60px, transparent 61px), linear-gradient(90deg, ${adminTheme.color.surfaceMuted} 0%, ${adminTheme.color.surface} 50%, ${adminTheme.color.surfaceMuted} 100%)`,
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
      <div style={{ fontSize: 22, fontWeight: 700, color: adminTheme.color.text, display: "flex", alignItems: "center", gap: 8 }}>
        <span>{props.title}</span>
        {props.hint ? <HintBadge text={props.hint} /> : null}
      </div>
      <div style={{ fontSize: 13, color: adminTheme.color.textMuted }}>{props.subtitle}</div>
    </div>
  )
}

function DirectoryCard(props: {
  eyebrow: string
  title: string
  body: string
  links: Array<{ label: string; href: string }>
  icon: string
}) {
  return (
    <div
      style={directoryCardStyle}
      onMouseEnter={(event) => {
        const node = event.currentTarget
        node.style.transform = "translateY(-2px)"
        node.style.boxShadow = adminTheme.shadow.focus
        node.style.borderColor = adminTheme.color.primary
      }}
      onMouseLeave={(event) => {
        const node = event.currentTarget
        node.style.transform = ""
        node.style.boxShadow = adminCardStyle.boxShadow as string
        node.style.borderColor = adminTheme.color.border
      }}
      onFocus={(event) => {
        const node = event.currentTarget
        node.style.transform = "translateY(-2px)"
        node.style.boxShadow = adminTheme.shadow.focus
        node.style.borderColor = adminTheme.color.primary
      }}
      onBlur={(event) => {
        const node = event.currentTarget
        node.style.transform = ""
        node.style.boxShadow = adminCardStyle.boxShadow as string
        node.style.borderColor = adminTheme.color.border
      }}
      tabIndex={0}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div
          style={{
            width: 42,
            height: 4,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${adminTheme.color.primary} 0%, ${adminTheme.color.accent} 100%)`,
          }}
        />
        <Monogram text={props.icon} tone="accent" />
      </div>
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={labelStyle}>{props.eyebrow}</div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: adminTheme.color.text }}>{props.title}</div>
        <div style={{ fontSize: 13, color: adminTheme.color.textMuted, lineHeight: 1.6 }}>{props.body}</div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {props.links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            style={{
              ...buttonBaseStyle,
              textDecoration: "none",
              padding: "7px 12px",
              borderRadius: 10,
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  )
}

function MetricCard(props: {
  label: string
  value: string
  helper: string
  hint?: string
  icon?: string
  href?: string
  active?: boolean
  onClick?: () => void
  focusLabel?: string
  viewDetailLabel?: string
  detailLinkLabel?: string
}) {
  const content = (
    <div
      style={{
        ...(props.href || props.onClick ? interactiveCardStyle : statCardStyle),
        borderColor: props.active ? adminTheme.color.primary : undefined,
        boxShadow: props.active ? adminTheme.shadow.focus : undefined,
        background: props.active
          ? `linear-gradient(180deg, ${adminTheme.color.primarySoft} 0%, ${adminTheme.color.surface} 100%)`
          : undefined,
      }}
    >
      <div
        style={{
          width: props.active ? 54 : 36,
          height: 4,
          borderRadius: 999,
          background: props.active
            ? `linear-gradient(90deg, ${adminTheme.color.primary} 0%, ${adminTheme.color.accent} 100%)`
            : adminTheme.color.borderStrong,
        }}
      />
      <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={labelStyle}>{props.label}</div>
        <Monogram text={props.icon ?? "KP"} />
      </div>
      {props.hint ? (
        <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end" }}>
          <HintBadge text={props.hint} />
        </div>
      ) : null}
      <div style={{ ...valueStyle, marginTop: 8 }}>{props.value}</div>
      <div style={{ marginTop: 8, fontSize: 13, color: adminTheme.color.textMuted }}>{props.helper}</div>
      {props.href || props.onClick ? (
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 8 }}>
          <div style={{ fontSize: 12, color: adminTheme.color.primary, fontWeight: 700 }}>
            {props.onClick ? (props.focusLabel ?? "Apply focus") : (props.viewDetailLabel ?? "View detail ->")}
          </div>
          {props.href ? (
            <a
              href={props.href}
              onClick={(event) => event.stopPropagation()}
              style={{ fontSize: 12, color: adminTheme.color.primary, fontWeight: 700, textDecoration: "none" }}
            >
              {props.detailLinkLabel ?? "Detail ->"}
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
            node.style.boxShadow = adminTheme.shadow.focus
            node.style.borderColor = adminTheme.color.primary
          }
        }}
        onMouseLeave={(event) => {
          const node = event.currentTarget.firstElementChild as HTMLElement | null
          if (node) {
            node.style.transform = ""
            node.style.boxShadow = props.active
              ? adminTheme.shadow.focus
              : (interactiveCardStyle.boxShadow as string)
            node.style.borderColor = props.active ? adminTheme.color.primary : adminTheme.color.border
          }
        }}
        onFocus={(event) => {
          const node = event.currentTarget.firstElementChild as HTMLElement | null
          if (node) {
            node.style.transform = "translateY(-2px)"
            node.style.boxShadow = adminTheme.shadow.focus
            node.style.borderColor = adminTheme.color.primary
          }
        }}
        onBlur={(event) => {
          const node = event.currentTarget.firstElementChild as HTMLElement | null
          if (node) {
            node.style.transform = ""
            node.style.boxShadow = props.active ? adminTheme.shadow.focus : (interactiveCardStyle.boxShadow as string)
            node.style.borderColor = props.active ? adminTheme.color.primary : adminTheme.color.border
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
  emptyLabel?: string
}) {
  if (!props.data.length) {
    return <div style={{ fontSize: 14, color: adminTheme.color.textMuted }}>{props.emptyLabel ?? "No sales data in selected range."}</div>
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
            <stop offset="0%" stopColor={adminTheme.color.primary} stopOpacity="0.28" />
            <stop offset="100%" stopColor={adminTheme.color.primary} stopOpacity="0.03" />
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
              stroke={adminTheme.color.border}
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
          stroke={adminTheme.color.primary}
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={line}
        />
        {points.map((point) =>
          props.pointHref ? (
            <a key={point.item.date} href={props.pointHref(point.item.date)}>
              <circle cx={point.x} cy={point.y} r="6" fill="transparent" />
              <circle cx={point.x} cy={point.y} r="4" fill={adminTheme.color.primary} />
            </a>
          ) : (
            <circle key={point.item.date} cx={point.x} cy={point.y} r="4" fill={adminTheme.color.primary} />
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
                style={{ fontSize: 12, color: adminTheme.color.primary, textDecoration: "none", fontWeight: 700 }}
              >
                {formatDateLabel(point.item.date)}
              </a>
            ) : (
              <div key={point.item.date} style={{ fontSize: 12, color: adminTheme.color.textMuted }}>
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
  emptyLabel?: string
  detailLabel?: string
}) {
  const max = Math.max(...props.items.map((item) => item.value), 1)

  if (!props.items.length) {
    return <div style={{ fontSize: 14, color: adminTheme.color.textMuted }}>{props.emptyLabel ?? "No data in selected range."}</div>
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
              <div style={{ fontSize: 13, color: adminTheme.color.text, fontWeight: 700 }}>{item.label}</div>
              <div style={{ fontSize: 13, color: adminTheme.color.textMuted }}>
                {props.valueFormatter ? props.valueFormatter(item.value) : formatNumber(item.value)}
              </div>
            </a>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontSize: 13, color: adminTheme.color.text, fontWeight: 700 }}>{item.label}</div>
              <div style={{ fontSize: 13, color: adminTheme.color.textMuted }}>
                {props.valueFormatter ? props.valueFormatter(item.value) : formatNumber(item.value)}
              </div>
            </div>
          )}
          <div
            style={{
              height: 10,
              background: adminTheme.color.surfaceMuted,
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
            <div style={{ fontSize: 12, color: adminTheme.color.textMuted }}>{item.helper}</div>
          ) : null}
          {item.href ? (
            <div style={{ fontSize: 11, color: adminTheme.color.primary, fontWeight: 700 }}>{props.detailLabel ?? "Open detail ->"}</div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function DonutChart(props: {
  items: Array<{ label: string; value: number; color: string; href?: string }>
  centerLabel?: string
}) {
  const total = props.items.reduce((sum, item) => sum + item.value, 0)
  let current = 0

  return (
    <div style={{ display: "grid", gap: 14, alignItems: "center" }}>
      <svg viewBox="0 0 120 120" style={{ width: 180, height: 180, justifySelf: "center" }}>
        <circle cx="60" cy="60" r="42" fill="none" stroke={adminTheme.color.surfaceMuted} strokeWidth="16" />
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
        <text x="60" y="56" textAnchor="middle" fontSize="12" fill={adminTheme.color.textMuted}>
          {props.centerLabel ?? "Open CRM"}
        </text>
        <text x="60" y="72" textAnchor="middle" fontSize="18" fontWeight="700" fill={adminTheme.color.text}>
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
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: adminTheme.color.text, fontSize: 13 }}>
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
                <div style={{ fontSize: 13, color: adminTheme.color.textMuted }}>{formatNumber(item.value)}</div>
              </a>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: adminTheme.color.text, fontSize: 13 }}>
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
                <div style={{ fontSize: 13, color: adminTheme.color.textMuted }}>{formatNumber(item.value)}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const ReportsPage = () => {
  const { t } = useAdminLanguage()
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
        setError(t("请选择有效的日期范围。", "Please provide a valid date range."))
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
          setError(err instanceof Error ? err.message : t("报表加载失败", "Failed to load report"))
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
      helper: t(`${formatNumber(item.quantity)} 件售出，分布在 ${formatNumber(item.orders)} 条明细中`, `${formatNumber(item.quantity)} sold across ${formatNumber(item.orders)} line items`),
      href: `${buildDrilldownPath("/app/reports-products", reportParams)}&q=${encodeURIComponent(item.title)}`,
    }))
  }, [report, reportParams, t])

  const leadBars = useMemo(() => {
    const rows = report?.crm.lead_status ?? {}
    return [
      { label: t("新线索", "New"), value: rows.new ?? 0, href: "/app/reports-crm-leads?status=new" },
      { label: t("已联系", "Contacted"), value: rows.contacted ?? 0, href: "/app/reports-crm-leads?status=contacted" },
      { label: t("已确认", "Qualified"), value: rows.qualified ?? 0, href: "/app/reports-crm-leads?status=qualified" },
      { label: t("已流失", "Lost"), value: rows.lost ?? 0, href: "/app/reports-crm-leads?status=lost" },
    ]
  }, [report, t])

  const opportunityBars = useMemo(() => {
    const rows = report?.crm.opportunity_stage ?? {}
    return [
      { label: t("初步接洽", "Prospecting"), value: rows.prospecting ?? 0, href: "/app/reports-crm-opportunities?stage=prospecting" },
      { label: t("谈判中", "Negotiation"), value: rows.negotiation ?? 0, href: "/app/reports-crm-opportunities?stage=negotiation" },
      { label: t("已赢单", "Closed Won"), value: rows.closed_won ?? 0, href: "/app/reports-crm-opportunities?stage=closed_won" },
      { label: t("已丢单", "Closed Lost"), value: rows.closed_lost ?? 0, href: "/app/reports-crm-opportunities?stage=closed_lost" },
    ]
  }, [report, t])

  const taskDonut = useMemo(() => {
    const rows = report?.crm.task_status ?? {}
    return [
      { label: t("待处理", "Open"), value: rows.open ?? 0, color: adminTheme.color.primary, href: "/app/reports-crm-tasks?status=open" },
      { label: t("进行中", "In Progress"), value: rows.in_progress ?? 0, color: adminTheme.color.accent, href: "/app/reports-crm-tasks?status=in_progress" },
      { label: t("已完成", "Completed"), value: rows.completed ?? 0, color: adminTheme.color.success, href: "/app/reports-crm-tasks?status=completed" },
      { label: t("已逾期", "Overdue"), value: rows.overdue ?? 0, color: adminTheme.color.danger, href: "/app/reports-crm-tasks?status=overdue" },
    ]
  }, [report, t])

  const copyCurrentLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      showNotice(t("链接已复制", "Link copied"), "success")
    } catch {
      showNotice(t("复制失败", "Copy failed"), "error")
    }
  }

  const saveCurrentView = () => {
    const name = window.prompt(t("保存视图名称", "Saved view name"))
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
    showNotice(t("视图已保存", "View saved"), "success")
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

    if (!window.confirm(t(`确认删除保存视图“${target.name}”？`, `Delete saved view "${target.name}"?`))) {
      return
    }

    setSavedViews((current) => current.filter((view) => view.id !== id))
    showNotice(t("视图已删除", "View deleted"), "success")
  }

  const renameSavedView = (id: string) => {
    const target = savedViews.find((view) => view.id === id)
    if (!target) {
      return
    }

    const name = window.prompt(t("重命名保存视图", "Rename saved view"), target.name)
    if (!name?.trim()) {
      return
    }

    setSavedViews((current) =>
      current.map((view) => (view.id === id ? { ...view, name: name.trim() } : view))
    )
    showNotice(t("视图已重命名", "View renamed"), "success")
  }

  const togglePinSavedView = (id: string) => {
    const target = savedViews.find((view) => view.id === id)
    setSavedViews((current) =>
      current
        .map((view) => (view.id === id ? { ...view, pinned: !view.pinned } : view))
        .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
    )
    if (target) {
      showNotice(target.pinned ? t("已取消置顶", "View unpinned") : t("视图已置顶", "View pinned"), "info")
    }
  }

  const filterSummary = useMemo(() => {
    const modeLabel =
      mode === "preset"
        ? t(`范围：最近 ${days} 天`, `Range: last ${days} days`)
        : t(`范围：${startDate || "--"} 至 ${endDate || "--"}`, `Range: ${startDate || "--"} to ${endDate || "--"}`)

    const viewLabel =
      dashboardView === "overview"
        ? t("焦点：总览", "Focus: overview")
        : dashboardView === "sales"
          ? t("焦点：销售", "Focus: sales")
          : dashboardView === "crm"
            ? t("焦点：CRM", "Focus: CRM")
            : t("焦点：运营", "Focus: operations")

    const savedLabel = savedViews.length ? t(`保存视图：${savedViews.length}`, `Saved views: ${savedViews.length}`) : t("保存视图：无", "Saved views: none")
    const pinnedLabel = savedViews.some((view) => view.pinned)
      ? t(`置顶：${savedViews.filter((view) => view.pinned).length}`, `Pinned: ${savedViews.filter((view) => view.pinned).length}`)
      : t("置顶：无", "Pinned: none")

    const updatedLabel = lastUpdatedAt
      ? `${t("更新时间", "Updated")}: ${new Intl.DateTimeFormat("en-AU", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(lastUpdatedAt))}`
      : t("更新时间：加载中", "Updated: loading")

    return [modeLabel, viewLabel, savedLabel, pinnedLabel, updatedLabel]
  }, [mode, days, startDate, endDate, dashboardView, savedViews, lastUpdatedAt, t])

  const visibleSavedViews = useMemo(() => {
    const q = savedViewQuery.trim().toLowerCase()
    if (!q) {
      return savedViews
    }

    return savedViews.filter((view) => view.name.toLowerCase().includes(q))
  }, [savedViews, savedViewQuery])

  const refreshReport = () => {
    setRefreshKey((value) => value + 1)
    showNotice(t("正在刷新...", "Refreshing..."), "info")
  }

  const groupedSavedViews = useMemo(() => {
    return {
      pinned: visibleSavedViews.filter((view) => view.pinned),
      others: visibleSavedViews.filter((view) => !view.pinned),
    }
  }, [visibleSavedViews])

  const reportDirectoryCards = useMemo(
    () => [
      {
        eyebrow: t("销售", "Sales"),
        icon: "SA",
        title: t("销售报表目录", "Sales report catalog"),
        body: t("集中查看销售总览、订单明细和商品销售明细。", "Jump into revenue overview, order drill-downs, and product sales breakdowns."),
        links: [
          { label: t("订单明细", "Order details"), href: buildDrilldownPath("/app/reports-orders", { days, start: startDate, end: endDate }) },
          { label: t("商品销售", "Product sales"), href: buildDrilldownPath("/app/reports-products", { days, start: startDate, end: endDate }) },
        ],
      },
      {
        eyebrow: t("CRM", "CRM"),
        icon: "CRM",
        title: t("CRM 报表目录", "CRM report catalog"),
        body: t("按线索、商机、任务三个维度下钻 CRM 明细。", "Drill into CRM by leads, opportunities, and tasks."),
        links: [
          { label: t("线索明细", "Lead details"), href: buildDrilldownPath("/app/reports-crm-leads", { days, start: startDate, end: endDate }) },
          { label: t("商机明细", "Opportunity details"), href: buildDrilldownPath("/app/reports-crm-opportunities", { days, start: startDate, end: endDate }) },
          { label: t("任务明细", "Task details"), href: buildDrilldownPath("/app/reports-crm-tasks", { days, start: startDate, end: endDate }) },
        ],
      },
      {
        eyebrow: t("工作台", "Workspace"),
        icon: "OPS",
        title: t("后台快捷入口", "Workspace shortcuts"),
        body: t("直接打开 CRM 工作台、订单和客户页面。", "Open the CRM workspace, orders, and customers directly."),
        links: [
          { label: t("CRM 工作台", "CRM workspace"), href: "/app/crm" },
          { label: t("订单", "Orders"), href: "/app/orders" },
          { label: t("客户", "Customers"), href: "/app/customers" },
        ],
      },
    ],
    [days, startDate, endDate, t]
  )

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
          title={t("销售 + CRM 仪表盘", "Sales + CRM dashboard")}
          crumbs={[
            { label: t("报表", "Reports") },
          ]}
          aside={
          <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setMode("preset")}
                style={{
                  ...buttonBaseStyle,
                  ...(mode === "preset" ? buttonActiveStyle : null),
                }}
              >
                {t("预设", "Preset")}
              </button>
              <button
                type="button"
                onClick={() => setMode("custom")}
                style={{
                  ...buttonBaseStyle,
                  ...(mode === "custom" ? buttonActiveStyle : null),
                }}
              >
                {t("自定义", "Custom")}
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
                      ...(days === value ? buttonActiveStyle : null),
                    }}
                  >
                    {t(`最近 ${value} 天`, `Last ${value} days`)}
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
                {t("导出 CSV", "Export CSV")}
              </a>
              <button type="button" onClick={saveCurrentView} style={buttonBaseStyle}>
                {t("保存视图", "Save View")}
              </button>
              <button type="button" onClick={copyCurrentLink} style={buttonBaseStyle}>
                {t("复制报表链接", "Copy Report Link")}
              </button>
              <button type="button" onClick={refreshReport} style={buttonBaseStyle} disabled={loading}>
                {loading ? t("正在刷新...", "Refreshing...") : t("刷新", "Refresh")}
              </button>
              <a href="/app/orders" style={{ ...buttonBaseStyle, textDecoration: "none" }}>
                {t("打开订单", "Open Orders")}
              </a>
              <a href="/app/customers" style={{ ...buttonBaseStyle, textDecoration: "none" }}>
                {t("打开客户", "Open Customers")}
              </a>
            </div>
          </div>
          }
        />
        <div style={{ marginTop: 12, fontSize: 13, color: adminTheme.color.textMuted }}>
          {report
            ? t(`${formatDateLabel(report.range.start)} 至 ${formatDateLabel(report.range.end)}`, `${formatDateLabel(report.range.start)} to ${formatDateLabel(report.range.end)}`)
            : t("正在加载报表范围...", "Loading report range...")}
        </div>
        {notice ? (
          <div style={{ marginTop: 8, fontSize: 12, color: adminTheme.color.primary, fontWeight: 600 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 999,
                background:
                  notice.tone === "success"
                    ? adminTheme.color.successSoft
                    : notice.tone === "error"
                      ? adminTheme.color.dangerSoft
                      : adminTheme.color.infoSoft,
                color:
                  notice.tone === "success"
                    ? adminTheme.color.success
                    : notice.tone === "error"
                      ? adminTheme.color.danger
                      : adminTheme.color.info,
                border:
                  notice.tone === "success"
                    ? `1px solid ${adminTheme.color.success}`
                    : notice.tone === "error"
                      ? `1px solid ${adminTheme.color.danger}`
                      : `1px solid ${adminTheme.color.info}`,
              }}
            >
              {notice.message}
            </span>
          </div>
        ) : null}
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <SectionTitle
            eyebrow={t("目录", "Catalog")}
            title={t("报表分类卡片", "Report category cards")}
            subtitle={t("把销售、CRM 和常用后台入口集中在一处，减少左侧菜单依赖。", "Group sales, CRM, and common admin entry points in one place instead of relying on the sidebar.")}
          />
          <div style={directoryGridStyle}>
            {reportDirectoryCards.map((card) => (
              <DirectoryCard
                key={card.title}
                icon={card.icon}
                eyebrow={card.eyebrow}
                title={card.title}
                body={card.body}
                links={card.links}
              />
            ))}
          </div>
        </div>
        {savedViews.length ? (
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={savedViewQuery}
                onChange={(event) => setSavedViewQuery(event.target.value)}
                placeholder={t("筛选保存视图", "Filter saved views")}
                style={{ ...inputStyle, minWidth: 220 }}
              />
              <span style={{ fontSize: 12, color: adminTheme.color.textMuted }}>
                {t(`显示 ${visibleSavedViews.length} / ${savedViews.length}`, `Showing ${visibleSavedViews.length} of ${savedViews.length}`)}
              </span>
            </div>
            {groupedSavedViews.pinned.length ? (
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, color: adminTheme.color.accent, fontWeight: 700 }}>{t("已置顶", "Pinned")}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {groupedSavedViews.pinned.map((view) => (
                  <div
                    key={view.id}
                    style={{
                      ...viewChipStyle,
                      ...(view.pinned ? pinnedViewStyle : null),
                    }}
                  >
                    <span style={{ fontSize: 12, color: adminTheme.color.accent, fontWeight: 700 }}>{t("已置顶", "Pinned")}</span>
                    <button type="button" onClick={() => applySavedView(view)} style={{ ...viewActionButtonStyle, color: adminTheme.color.primary, fontWeight: 700 }}>
                      {view.name}
                    </button>
                    <button type="button" onClick={() => renameSavedView(view.id)} style={{ ...viewActionButtonStyle, color: adminTheme.color.textMuted }}>
                      {t("重命名", "rename")}
                    </button>
                    <button type="button" onClick={() => togglePinSavedView(view.id)} style={{ ...viewActionButtonStyle, color: adminTheme.color.accent, fontWeight: 700 }}>
                      {t("取消置顶", "unpin")}
                    </button>
                    <button type="button" onClick={() => deleteSavedView(view.id)} style={{ ...viewActionButtonStyle, color: adminTheme.color.danger }}>
                      x
                    </button>
                  </div>
                ))}
                </div>
              </div>
            ) : null}
            {groupedSavedViews.others.length ? (
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, color: adminTheme.color.textMuted, fontWeight: 700 }}>{t("其他", "Others")}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {groupedSavedViews.others.map((view) => (
              <div
                key={view.id}
                style={{
                  ...viewChipStyle,
                  ...(view.pinned ? pinnedViewStyle : null),
                }}
              >
                {view.pinned ? (
                  <span style={{ fontSize: 12, color: adminTheme.color.accent, fontWeight: 700 }}>{t("已置顶", "Pinned")}</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => applySavedView(view)}
                  style={{ ...viewActionButtonStyle, color: adminTheme.color.primary, fontWeight: 700 }}
                >
                  {view.name}
                </button>
                <button
                  type="button"
                  onClick={() => renameSavedView(view.id)}
                  style={{ ...viewActionButtonStyle, color: adminTheme.color.textMuted }}
                >
                  {t("重命名", "rename")}
                </button>
                <button
                  type="button"
                  onClick={() => togglePinSavedView(view.id)}
                  style={{ ...viewActionButtonStyle, color: view.pinned ? adminTheme.color.accent : adminTheme.color.textMuted, fontWeight: view.pinned ? 700 : 400 }}
                >
                  {view.pinned ? t("取消置顶", "unpin") : t("置顶", "pin")}
                </button>
                <button
                  type="button"
                  onClick={() => deleteSavedView(view.id)}
                  style={{ ...viewActionButtonStyle, color: adminTheme.color.danger }}
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
            ["overview", t("总览", "Overview")],
            ["sales", t("销售", "Sales")],
            ["crm", "CRM"],
            ["operations", t("运营", "Operations")],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setDashboardView(value as "overview" | "sales" | "crm" | "operations")
              }
              style={{
                ...buttonBaseStyle,
                ...(dashboardView === value ? buttonActiveStyle : null),
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
            <div style={{ fontSize: 13, fontWeight: 700, color: adminTheme.color.text }}>{t("仪表盘说明", "Dashboard guidance")}</div>
            <div style={{ fontSize: 12, color: adminTheme.color.textMuted }}>
              {t("说明销售、CRM 和运营卡片的统计口径及下钻方式。", "Definitions and drill-down context for the sales, CRM, and operations cards.")}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowExplainCards((value) => !value)}
            style={buttonBaseStyle}
          >
            {showExplainCards ? t("收起说明", "Hide guidance") : t("显示说明", "Show guidance")}
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
              title={t("销售卡片", "Sales cards")}
              body={t("销售总额统计未取消订单金额；净销售额会扣除退款；已取消订单会单独展示，避免干扰有效销售。", "Gross sales tracks non-canceled order value. Net sales subtracts refunded amounts, while canceled demand stays separated in operations.")}
            />
            <ExplainCard
              title={t("CRM 管道", "CRM pipeline")}
              body={t("Pipeline 金额来自当前仍在推进中的商机；已赢单显示已成交金额，不代表预测值。", "Pipeline amount comes from currently open opportunities. Closed won shows already-converted deal value, not forecast.")}
            />
            <ExplainCard
              title={t("下钻方式", "Drill-down behavior")}
              body={t("点击 KPI 会切换仪表盘焦点；点击详情链接或图表项会打开对应的订单、商品、线索、商机或任务明细页。", "Clicking a KPI changes dashboard focus. Detail links and chart items open filtered order, product, lead, opportunity, or task pages.")}
            />
            <ExplainCard
              title={t("指标口径", "Metric source")}
              body={t("销售卡片基于当前时间范围的聚合结果；CRM 卡片反映的是当前线索、商机和任务状态，而不是历史分群。", "Sales cards are based on report aggregation for the current range. CRM cards reflect current lead, opportunity, and task states rather than historical cohorts.")}
            />
          </div>
        ) : null}
      </div>

      {error ? (
        <div
          style={{
            ...panelStyle,
            color: adminTheme.color.danger,
            borderColor: adminTheme.color.danger,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span>{error}</span>
          <button type="button" onClick={refreshReport} style={buttonBaseStyle} disabled={loading}>
            {loading ? t("正在刷新...", "Refreshing...") : t("重试", "Retry")}
          </button>
        </div>
      ) : null}

      {!loading && !error && !hasDashboardData ? (
        <EmptyGuide
          title={t("当前时间范围没有报表数据", "No report data in this range")}
          body={t("可以尝试扩大日期范围、切回预设时间窗口，或先创建一些订单和 CRM 记录，让仪表盘有可展示的销售和管道活动。", "Try expanding the date range, switching back to a preset window, or creating a few orders and CRM records so the dashboard has sales and pipeline activity to show.")}
        />
      ) : null}

      <div style={cardGridStyle}>
        {loading && !report ? (
          Array.from({ length: 7 }).map((_, index) => <MetricCardSkeleton key={index} />)
        ) : (
          <>
            <MetricCard
              icon="GMV"
              label={t("销售总额", "Gross Sales")}
              value={report?.summary.total_sales_display ?? "--"}
              helper={t(`${formatNumber(report?.summary.orders_count ?? 0)} 个未取消订单`, `${formatNumber(report?.summary.orders_count ?? 0)} non-canceled orders`)}
              hint={t("统计当前时间范围内所有未取消订单的金额汇总。", "Aggregated from non-canceled orders inside the current report range.")}
              href={buildDrilldownPath("/app/reports-orders", reportParams)}
              onClick={() => setDashboardView("sales")}
              active={dashboardView === "sales"}
              focusLabel={t("切换焦点", "Apply focus")}
              viewDetailLabel={t("查看详情 ->", "View detail ->")}
              detailLinkLabel={t("详情 ->", "Detail ->")}
            />
            <MetricCard
              icon="NET"
              label={t("净销售额", "Net Sales")}
              value={report?.summary.net_sales_display ?? "--"}
              helper={t(`${formatNumber(report?.summary.refunded_orders ?? 0)} 个退款订单，部分退款 ${formatNumber(report?.summary.partial_refund_orders ?? 0)} 个`, `${formatNumber(report?.summary.refunded_orders ?? 0)} refunded orders, ${formatNumber(report?.summary.partial_refund_orders ?? 0)} partial`)}
              hint={t("净销售额等于销售总额减去同一时间范围内的退款金额。", "Gross sales minus refunded totals in the same date range.")}
              href={buildDrilldownPath("/app/reports-orders", { ...reportParams, status: "refunded" })}
              onClick={() => setDashboardView("sales")}
              active={dashboardView === "sales"}
              focusLabel={t("切换焦点", "Apply focus")}
              viewDetailLabel={t("查看详情 ->", "View detail ->")}
              detailLinkLabel={t("详情 ->", "Detail ->")}
            />
            <MetricCard
              icon="REF"
              label={t("退款金额", "Refunded")}
              value={report?.summary.refunded_total_display ?? "--"}
              helper={t(`${formatNumber(report?.summary.full_refund_orders ?? 0)} 个全额退款`, `${formatNumber(report?.summary.full_refund_orders ?? 0)} full refunds`)}
              hint={t("同时包含全额退款和部分退款订单。", "Includes both full and partial refunds recorded on matching orders.")}
              href={buildDrilldownPath("/app/reports-orders", { ...reportParams, status: "refunded" })}
              onClick={() => setDashboardView("sales")}
              active={dashboardView === "sales"}
              focusLabel={t("切换焦点", "Apply focus")}
              viewDetailLabel={t("查看详情 ->", "View detail ->")}
              detailLinkLabel={t("详情 ->", "Detail ->")}
            />
            <MetricCard
              icon="CAN"
              label={t("已取消订单", "Canceled Orders")}
              value={formatNumber(report?.summary.canceled_orders ?? 0)}
              helper={report?.summary.canceled_sales_display ?? "--"}
              hint={t("已取消需求单独展示，避免运营问题扭曲有效销售表现。", "Canceled demand is shown separately so operations issues do not distort active sales.")}
              href={buildDrilldownPath("/app/reports-orders", { ...reportParams, status: "canceled" })}
              onClick={() => setDashboardView("operations")}
              active={dashboardView === "operations"}
              focusLabel={t("切换焦点", "Apply focus")}
              viewDetailLabel={t("查看详情 ->", "View detail ->")}
              detailLinkLabel={t("详情 ->", "Detail ->")}
            />
            <MetricCard
              icon="AOV"
              label={t("平均客单价", "Average Order")}
              value={report?.summary.avg_order_value_display ?? "--"}
              helper={t(`${formatNumber(report?.summary.active_customers ?? 0)} 位活跃买家`, `${formatNumber(report?.summary.active_customers ?? 0)} active buyers`)}
              hint={t("平均客单价按当前时间范围内未取消订单计算。", "Average order value is based on non-canceled orders in the selected range.")}
              href={buildDrilldownPath("/app/reports-orders", { ...reportParams, status: "active" })}
              onClick={() => setDashboardView("sales")}
              active={dashboardView === "sales"}
              focusLabel={t("切换焦点", "Apply focus")}
              viewDetailLabel={t("查看详情 ->", "View detail ->")}
              detailLinkLabel={t("详情 ->", "Detail ->")}
            />
            <MetricCard
              icon="NEW"
              label={t("新增客户", "New Customers")}
              value={formatNumber(report?.summary.new_customers ?? 0)}
              helper={t("当前时间范围内创建的客户", "Customers created in selected range")}
              hint={t("这里统计的是客户创建量，不等同于首单转化。", "This is customer creation volume, not necessarily first purchase conversion.")}
              href="/app/customers"
              onClick={() => setDashboardView("sales")}
              active={dashboardView === "sales"}
              focusLabel={t("切换焦点", "Apply focus")}
              viewDetailLabel={t("查看详情 ->", "View detail ->")}
              detailLinkLabel={t("详情 ->", "Detail ->")}
            />
            <MetricCard
              icon="TSK"
              label={t("待处理任务", "Open Tasks")}
              value={formatNumber(report?.summary.open_tasks ?? 0)}
              helper={t(`${formatPercent(report?.crm.conversion_rate ?? 0)} 线索确认率`, `${formatPercent(report?.crm.conversion_rate ?? 0)} lead qualification rate`)}
              hint={t("待处理任务反映当前 CRM 的工作负载状态，而不是历史任务创建量。", "Open tasks reflect current CRM workload state, not historical task creation.")}
              href="/app/reports-crm-tasks?status=open"
              onClick={() => setDashboardView("operations")}
              active={dashboardView === "operations"}
              focusLabel={t("切换焦点", "Apply focus")}
              viewDetailLabel={t("查看详情 ->", "View detail ->")}
              detailLinkLabel={t("详情 ->", "Detail ->")}
            />
          </>
        )}
      </div>

      {dashboardView !== "crm" && (
      <div style={sectionGridStyle}>
        <div style={panelStyle}>
          <SectionTitle
            eyebrow={t("销售", "Sales")}
            title={t("销售趋势", "Revenue trend")}
            subtitle={t("按天展示销售趋势，默认排除已取消订单。", "Daily sales trend excluding canceled orders.")}
            hint={t("点击任意一天可下钻到当天订单明细，查看高峰、退款和低谷。", "Each point opens that day in order drill-down so you can inspect spikes, refunds, and slower days.")}
          />
          <div style={{ marginTop: 16 }}>
            {loading ? (
              <ChartSkeleton rows={6} />
            ) : (
              <LineChart
                data={report?.sales_trend ?? []}
                pointHref={(date) => buildDayDrilldownPath(date)}
                emptyLabel={t("当前时间范围内没有销售数据。", "No sales data in selected range.")}
              />
            )}
          </div>
        </div>

        <div style={panelStyle}>
          <SectionTitle
            eyebrow={t("商机", "Pipeline")}
            title={t("CRM 快照", "CRM snapshot")}
            subtitle={t("显示当前 CRM 记录中的在途金额和已赢单金额。", "Open pipeline value and closed-won amount from current CRM records.")}
            hint={t("Pipeline 和赢单金额基于当前商机阶段，更适合作为实时运营数字，而非财务入账总额。", "Pipeline and won cards are based on current opportunity stages, so use them as live operational numbers rather than booked finance totals.")}
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
                  icon="PLC"
                  label={t("Pipeline 金额", "Pipeline Amount")}
                  value={report?.summary.pipeline_amount_display ?? "--"}
                  helper={t(`${formatNumber(report?.summary.total_opportunities ?? 0)} 个商机`, `${formatNumber(report?.summary.total_opportunities ?? 0)} opportunities`)}
                  href="/app/reports-crm-opportunities"
                  onClick={() => setDashboardView("crm")}
                  active={dashboardView === "crm"}
                  focusLabel={t("切换焦点", "Apply focus")}
                  viewDetailLabel={t("查看详情 ->", "View detail ->")}
                  detailLinkLabel={t("详情 ->", "Detail ->")}
                />
                <MetricCard
                  icon="WIN"
                  label={t("已赢单", "Closed Won")}
                  value={report?.summary.won_amount_display ?? "--"}
                  helper={t(`${formatNumber(report?.summary.total_leads ?? 0)} 条线索`, `${formatNumber(report?.summary.total_leads ?? 0)} tracked leads`)}
                  href="/app/reports-crm-leads?status=qualified"
                  onClick={() => setDashboardView("crm")}
                  active={dashboardView === "crm"}
                  focusLabel={t("切换焦点", "Apply focus")}
                  viewDetailLabel={t("查看详情 ->", "View detail ->")}
                  detailLinkLabel={t("详情 ->", "Detail ->")}
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
            eyebrow={t("热销商品", "Top Products")}
            title={t("商品排行", "Best sellers")}
            subtitle={t("按未取消订单行项目的销售贡献度排序。", "Ranked by sales contribution from non-canceled order line items.")}
            hint={t("这个榜单适合看陈列和补货优先级。点击任一条会进入按商品名称过滤后的销售明细页。", "This ranking helps merchandising and replenishment. Clicking a bar opens product sales detail filtered to that product title.")}
          />
          <div style={{ marginTop: 16 }}>
            {loading ? (
              <BarsSkeleton rows={5} />
            ) : (
              <HorizontalBars
                items={productBars}
                color="linear-gradient(90deg, #173f8a, #2f7cf6)"
                emptyLabel={t("当前时间范围内没有商品销售数据。", "No data in selected range.")}
                detailLabel={t("打开明细 ->", "Open detail ->")}
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
            eyebrow={t("任务", "Tasks")}
            title={t("任务健康度", "Task health")}
            subtitle={t("展示待处理、进行中、已完成和逾期任务。", "Open, in-progress, completed, and overdue workload.")}
            hint={t("逾期基于截止日期和未完成状态计算，适合发现执行滞后。", "Overdue is derived from due date plus unfinished status, which makes it useful for spotting execution lag.")}
          />
          <div style={{ marginTop: 16 }}>
            {loading ? (
              <DonutSkeleton />
            ) : (
              <DonutChart items={taskDonut} centerLabel={t("打开 CRM", "Open CRM")} />
            )}
          </div>
        </div>
      </div>
      )}

      {dashboardView !== "sales" && (
      <div style={sectionGridStyle}>
        <div style={panelStyle}>
          <SectionTitle
            eyebrow={t("线索", "Leads")}
            title={t("线索漏斗", "Lead funnel")}
            subtitle={t("显示 CRM 模块中当前线索阶段分布。", "Current lead stage distribution from the CRM module.")}
            hint={t("用线索漏斗看确认前的堵点。点击任意条目会打开对应状态的线索列表。", "Use the lead funnel to see where volume stalls before qualification. Each bar opens the matching lead list.")}
          />
          <div style={{ marginTop: 16 }}>
            {loading ? (
              <BarsSkeleton rows={4} />
            ) : (
              <HorizontalBars items={leadBars} color={adminTheme.color.success} emptyLabel={t("当前没有线索数据。", "No data in selected range.")} detailLabel={t("打开明细 ->", "Open detail ->")} />
            )}
          </div>
        </div>

        <div style={panelStyle}>
          <SectionTitle
            eyebrow={t("商机", "Opportunities")}
            title={t("商机阶段", "Deal stages")}
            subtitle={t("从初步接洽到赢单/丢单的商机阶段分布。", "Prospecting through closed-won/lost opportunity mix.")}
            hint={t("这里展示的是当前阶段分布，适合销售管理和下一步计划，不是分群转化分析。", "This is a live stage mix, useful for sales management and next-step planning rather than cohort conversion analysis.")}
          />
          <div style={{ marginTop: 16 }}>
            {loading ? (
              <BarsSkeleton rows={4} />
            ) : (
              <HorizontalBars items={opportunityBars} color={adminTheme.color.accent} emptyLabel={t("当前没有商机数据。", "No data in selected range.")} detailLabel={t("打开明细 ->", "Open detail ->")} />
            )}
          </div>
        </div>
      </div>
      )}
      <AdminLanguageDock />
    </div>
  )
}

export const config = defineRouteConfig({
  label: "报表 Reports",
  rank: 90,
})

export default ReportsPage
