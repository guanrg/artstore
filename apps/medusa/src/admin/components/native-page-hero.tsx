import type { CSSProperties } from "react"
import { adminTheme } from "../lib/admin-theme"

type NativePageHeroProps = {
  title: string
  pageKey: string
}

const shellStyle: CSSProperties = {
  marginBottom: 14,
}

const cardStyle: CSSProperties = {
  padding: "14px 18px",
  borderRadius: 18,
  border: `1px solid ${adminTheme.color.border}`,
  background: `linear-gradient(135deg, ${adminTheme.color.surfaceMuted} 0%, ${adminTheme.color.primarySoft} 58%, ${adminTheme.color.surface} 100%)`,
  boxShadow: adminTheme.shadow.card,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
}

const NativePageHero = ({
  title,
  pageKey,
}: NativePageHeroProps) => {
  return (
    <div style={shellStyle}>
      <div style={cardStyle}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 40, lineHeight: 1, fontWeight: 900, color: adminTheme.color.text, letterSpacing: "-0.04em" }}>
            {title}
          </div>
        </div>
        <div
          data-native-hero-actions={pageKey}
          style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}
        />
      </div>
    </div>
  )
}

export default NativePageHero
