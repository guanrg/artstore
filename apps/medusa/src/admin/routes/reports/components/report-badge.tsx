import type { CSSProperties, ReactNode } from "react"
import { adminTheme } from "../../../lib/admin-theme"

type ReportBadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "accent"

type ReportBadgeProps = {
  children: ReactNode
  tone?: ReportBadgeTone
}

const toneStyles: Record<ReportBadgeTone, CSSProperties> = {
  neutral: {
    background: adminTheme.color.surfaceMuted,
    color: adminTheme.color.textMuted,
    border: `1px solid ${adminTheme.color.border}`,
  },
  info: {
    background: adminTheme.color.infoSoft,
    color: adminTheme.color.info,
    border: `1px solid ${adminTheme.color.info}`,
  },
  success: {
    background: adminTheme.color.successSoft,
    color: adminTheme.color.success,
    border: `1px solid ${adminTheme.color.success}`,
  },
  warning: {
    background: adminTheme.color.accentSoft,
    color: adminTheme.color.accent,
    border: `1px solid ${adminTheme.color.accent}`,
  },
  danger: {
    background: adminTheme.color.dangerSoft,
    color: adminTheme.color.danger,
    border: `1px solid ${adminTheme.color.danger}`,
  },
  accent: {
    background: adminTheme.color.primarySoft,
    color: adminTheme.color.primary,
    border: `1px solid ${adminTheme.color.primary}`,
  },
}

const baseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 9px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
}

const ReportBadge = ({ children, tone = "neutral" }: ReportBadgeProps) => {
  return <span style={{ ...baseStyle, ...toneStyles[tone] }}>{children}</span>
}

export default ReportBadge
