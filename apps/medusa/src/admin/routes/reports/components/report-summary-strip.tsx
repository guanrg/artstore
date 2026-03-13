import type { CSSProperties } from "react"

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
  color: "#23364e",
  flexWrap: "wrap",
}

const ReportSummaryStrip = ({ items }: ReportSummaryStripProps) => {
  return (
    <div style={shellStyle}>
      {items.map((item) => (
        <span
          key={`${item.label}-${item.value}`}
          style={item.tone === "accent" ? { color: "#173f8a", fontWeight: 600 } : undefined}
        >
          {item.label} {item.value}
        </span>
      ))}
    </div>
  )
}

export default ReportSummaryStrip
