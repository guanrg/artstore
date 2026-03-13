import type { CSSProperties } from "react"
import AdminLanguageToggle from "./admin-language-toggle"
import { useAdminLanguage } from "../lib/admin-language"
import { adminTheme } from "../lib/admin-theme"

const shellStyle: CSSProperties = {
  position: "fixed",
  left: 12,
  bottom: 88,
  zIndex: 120,
  display: "grid",
  gap: 6,
  width: 132,
  padding: "7px 9px",
  borderRadius: 12,
  border: `1px solid ${adminTheme.color.border}`,
  background: "rgba(255, 253, 248, 0.96)",
  boxShadow: adminTheme.shadow.card,
  backdropFilter: "blur(8px)",
}

const AdminLanguageDock = () => {
  const { language, setLanguage, t } = useAdminLanguage()

  if (typeof window !== "undefined" && /^\/app\/login\/?$/.test(window.location.pathname)) {
    return null
  }

  return (
    <div style={shellStyle}>
      <div style={{ fontSize: 11, color: adminTheme.color.textMuted, fontWeight: 700 }}>
        {t("后台语言", "Admin language")}
      </div>
      <AdminLanguageToggle language={language} onChange={setLanguage} />
    </div>
  )
}

export default AdminLanguageDock
