import type { CSSProperties } from "react"
import { adminTheme } from "../../../lib/admin-theme"

type ReportEmptyStateProps = {
  title: string
  body: string
}

const shellStyle: CSSProperties = {
  marginBottom: 12,
  padding: "20px 18px",
  borderRadius: adminTheme.radius.lg,
  border: `1px dashed ${adminTheme.color.borderStrong}`,
  background: `linear-gradient(180deg, ${adminTheme.color.surface} 0%, ${adminTheme.color.surfaceMuted} 100%)`,
  textAlign: "center",
}

const ReportEmptyState = ({ title, body }: ReportEmptyStateProps) => {
  return (
    <div style={shellStyle}>
      <div style={{ fontSize: 16, fontWeight: 700, color: adminTheme.color.text }}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: adminTheme.color.textMuted }}>{body}</div>
    </div>
  )
}

export default ReportEmptyState
