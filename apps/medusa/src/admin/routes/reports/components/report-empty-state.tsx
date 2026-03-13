import type { CSSProperties } from "react"

type ReportEmptyStateProps = {
  title: string
  body: string
}

const shellStyle: CSSProperties = {
  marginBottom: 12,
  padding: "20px 18px",
  borderRadius: 16,
  border: "1px dashed #cad7e6",
  background: "linear-gradient(180deg, #fbfdff 0%, #f5f8fc 100%)",
  textAlign: "center",
}

const ReportEmptyState = ({ title, body }: ReportEmptyStateProps) => {
  return (
    <div style={shellStyle}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#17304d" }}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: "#607086" }}>{body}</div>
    </div>
  )
}

export default ReportEmptyState
