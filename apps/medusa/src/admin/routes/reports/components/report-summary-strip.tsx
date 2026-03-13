import type { CSSProperties } from "react"
import { adminTheme } from "../../../lib/admin-theme"

type SummaryItem = {
  label: string
  value: string
  tone?: "default" | "accent"
}

type ReportSummaryStripProps = {
  items: SummaryItem[]
}

const shellStyle: CSSProperties = {
  display: "flex",
  gap: 16,
  marginBottom: 12,
  fontSize: 13,
  color: adminTheme.color.text,
  flexWrap: "wrap",
}

const ReportSummaryStrip = ({ items }: ReportSummaryStripProps) => {
  return (
    <div style={shellStyle}>
      {items.map((item) => (
        <span
          key={`${item.label}-${item.value}`}
          style={item.tone === "accent" ? { color: adminTheme.color.primary, fontWeight: 700 } : undefined}
        >
          {item.label} {item.value}
        </span>
      ))}
    </div>
  )
}

export default ReportSummaryStrip
