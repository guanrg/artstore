import type { CSSProperties } from "react"

export const adminTheme = {
  color: {
    canvas: "#f4efe6",
    canvasAlt: "#efe8dc",
    surface: "#fffdf8",
    surfaceMuted: "#f6f1e8",
    surfaceAccent: "#eef4ef",
    border: "#d8d0c2",
    borderStrong: "#bcae97",
    text: "#1f2a2a",
    textMuted: "#5c6b67",
    primary: "#1f4d4d",
    primarySoft: "#dbe9e6",
    primaryText: "#f7fbfa",
    accent: "#b46a3c",
    accentSoft: "#f4e3d6",
    success: "#2f6b52",
    successSoft: "#e2f0e8",
    danger: "#a44d3f",
    dangerSoft: "#f7e2de",
    info: "#476a7a",
    infoSoft: "#e0ebf0",
    highlight: "#e7d7b7",
  },
  shadow: {
    soft: "0 10px 30px rgba(48, 39, 24, 0.06)",
    card: "0 14px 34px rgba(48, 39, 24, 0.08)",
    focus: "0 18px 40px rgba(31, 77, 77, 0.14)",
  },
  radius: {
    lg: 18,
    md: 14,
    sm: 10,
    pill: 999,
  },
} as const

export const adminCardStyle: CSSProperties = {
  background: adminTheme.color.surface,
  border: `1px solid ${adminTheme.color.border}`,
  borderRadius: adminTheme.radius.lg,
  boxShadow: adminTheme.shadow.card,
}
