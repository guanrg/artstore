import type { CSSProperties } from "react"
import type { AdminLanguage } from "../lib/admin-language"
import { adminTheme } from "../lib/admin-theme"

type AdminLanguageToggleProps = {
  language: AdminLanguage
  onChange: (language: AdminLanguage) => void
}

const shellStyle: CSSProperties = {
  display: "inline-flex",
  gap: 6,
  alignItems: "center",
  padding: 4,
  borderRadius: 999,
  border: `1px solid ${adminTheme.color.border}`,
  background: adminTheme.color.surface,
  boxShadow: adminTheme.shadow.soft,
}

const buttonStyle: CSSProperties = {
  border: "none",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  cursor: "pointer",
  background: "transparent",
  color: adminTheme.color.text,
  fontWeight: 600,
}

const AdminLanguageToggle = ({ language, onChange }: AdminLanguageToggleProps) => {
  return (
    <div style={shellStyle}>
      {[
        { key: "zhCN" as const, label: "中文" },
        { key: "en" as const, label: "EN" },
      ].map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          style={{
            ...buttonStyle,
            background: language === item.key ? adminTheme.color.primary : "transparent",
            color: language === item.key ? adminTheme.color.primaryText : adminTheme.color.text,
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export default AdminLanguageToggle
