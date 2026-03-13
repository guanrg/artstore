import type { CSSProperties, ReactNode } from "react"
import { adminTheme } from "../../../lib/admin-theme"

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
  background: adminTheme.color.surface,
  border: `1px solid ${adminTheme.color.border}`,
  borderRadius: adminTheme.radius.lg,
  padding: 18,
  display: "grid",
  gap: 8,
  boxShadow: adminTheme.shadow.card,
}

const ReportHeader = ({ title, subtitle, crumbs = [], aside }: ReportHeaderProps) => {
  return (
    <div style={shellStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 8 }}>
          {crumbs.length ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: adminTheme.color.textMuted }}>
              {crumbs.map((crumb, index) => (
                <span key={`${crumb.label}-${index}`} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  {crumb.href ? (
                    <a href={crumb.href} style={{ color: adminTheme.color.primary, textDecoration: "none", fontWeight: 700 }}>
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
          <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.15, color: adminTheme.color.text }}>{title}</h2>
          {subtitle ? <div style={{ fontSize: 13, color: adminTheme.color.textMuted }}>{subtitle}</div> : null}
        </div>
        {aside ? <div>{aside}</div> : null}
      </div>
    </div>
  )
}

export default ReportHeader
