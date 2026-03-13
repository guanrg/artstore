import { defineRouteConfig } from "@medusajs/admin-sdk"
import type { CSSProperties } from "react"
import AdminLanguageToggle from "../../../components/admin-language-toggle"
import { useAdminLanguage } from "../../../lib/admin-language"
import { adminCardStyle, adminTheme } from "../../../lib/admin-theme"

const shellStyle: CSSProperties = {
  minHeight: "100%",
  padding: 16,
  display: "grid",
  gap: 16,
  background: `radial-gradient(circle at top left, ${adminTheme.color.highlight} 0%, transparent 24%), linear-gradient(180deg, ${adminTheme.color.canvas} 0%, ${adminTheme.color.canvasAlt} 100%)`,
}

const cardStyle: CSSProperties = {
  ...adminCardStyle,
  padding: 18,
  borderRadius: 18,
  display: "grid",
  gap: 14,
  maxWidth: 720,
}

const AdminPreferencesPage = () => {
  const { language, setLanguage, t } = useAdminLanguage()

  return (
    <div style={shellStyle}>
      <div style={cardStyle}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: adminTheme.color.textMuted }}>
            {t("后台偏好", "Admin preferences")}
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              lineHeight: 1.05,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: adminTheme.color.text,
            }}
          >
            {t("语言", "Language")}
          </h1>
        </div>

        <div
          style={{
            display: "grid",
            gap: 10,
            padding: 14,
            borderRadius: 14,
            border: `1px solid ${adminTheme.color.border}`,
            background: adminTheme.color.surfaceMuted,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: adminTheme.color.text }}>
            {t("后台显示语言", "Admin display language")}
          </div>
          <div style={{ fontSize: 13, color: adminTheme.color.textMuted }}>
            {t("切换后会刷新后台页面。", "The admin will refresh after switching language.")}
          </div>
          <div>
            <AdminLanguageToggle language={language} onChange={setLanguage} />
          </div>
        </div>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "后台偏好",
  rank: 98,
})

export default AdminPreferencesPage
