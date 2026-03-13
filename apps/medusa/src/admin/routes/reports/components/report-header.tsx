import { useEffect, useRef, type CSSProperties, type ReactNode } from "react"
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
  padding: 16,
  display: "grid",
  gap: 10,
  boxShadow: adminTheme.shadow.card,
  position: "relative",
  overflow: "hidden",
}

const ReportHeader = ({ title, subtitle, crumbs = [], aside }: ReportHeaderProps) => {
  const shellRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) {
      return
    }

    const container = shell.parentElement
    const previous = container?.previousElementSibling as HTMLElement | null
    if (!previous) {
      return
    }

    const text = (previous.textContent || "").replace(/\s+/g, "")
    const onlyIconLikeContent = text.length <= 2
    if (onlyIconLikeContent) {
      previous.style.display = "none"
    }
  }, [])

  return (
    <div ref={shellRef} style={shellStyle}>
      <div
        style={{
          position: "absolute",
          inset: "0 auto auto 0",
          width: 96,
          height: 4,
          background: adminTheme.color.accent,
          borderBottomRightRadius: 999,
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 6 }}>
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
          <h2 style={{ margin: 0, fontSize: 30, lineHeight: 1.05, fontWeight: 900, letterSpacing: "-0.03em", color: adminTheme.color.text }}>
            {title}
          </h2>
          {subtitle ? <div style={{ fontSize: 12, color: adminTheme.color.textMuted }}>{subtitle}</div> : null}
        </div>
        {aside ? <div>{aside}</div> : null}
      </div>
    </div>
  )
}

export default ReportHeader
