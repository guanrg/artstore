import type { CSSProperties, ReactNode } from "react"

type Crumb = {
  label: string
  href?: string
}

type ReportHeaderProps = {
  title: string
  subtitle?: string
  crumbs?: Crumb[]
  aside?: ReactNode
}

const shellStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #d9e3ef",
  borderRadius: 16,
  padding: 16,
  display: "grid",
  gap: 8,
}

const ReportHeader = ({ title, subtitle, crumbs = [], aside }: ReportHeaderProps) => {
  return (
    <div style={shellStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 8 }}>
          {crumbs.length ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: "#607086" }}>
              {crumbs.map((crumb, index) => (
                <span key={`${crumb.label}-${index}`} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  {crumb.href ? (
                    <a href={crumb.href} style={{ color: "#173f8a", textDecoration: "none" }}>
                      {crumb.label}
                    </a>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                  {index < crumbs.length - 1 ? <span>/</span> : null}
                </span>
              ))}
            </div>
          ) : null}
          <h2 style={{ margin: 0, fontSize: 22 }}>{title}</h2>
          {subtitle ? <div style={{ fontSize: 13, color: "#607086" }}>{subtitle}</div> : null}
        </div>
        {aside ? <div>{aside}</div> : null}
      </div>
    </div>
  )
}

export default ReportHeader
