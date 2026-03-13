import type { CSSProperties, ReactNode } from "react"
import { adminTheme } from "../../../lib/admin-theme"

export const toolbarInputStyle: CSSProperties = {
  border: `1px solid ${adminTheme.color.border}`,
  borderRadius: adminTheme.radius.sm,
  padding: "8px 10px",
  fontSize: 13,
  background: adminTheme.color.surface,
  color: adminTheme.color.text,
  boxShadow: adminTheme.shadow.soft,
}

const toolbarToggleWrapStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
}

const toolbarToggleButtonStyle: CSSProperties = {
  ...toolbarInputStyle,
  padding: "6px 10px",
  borderRadius: 999,
  cursor: "pointer",
}

type ToolbarToggleGroupProps = {
  label: string
  options: Array<{
    key: string
    label: string
    active: boolean
    onToggle: () => void
  }>
}

export const ToolbarToggleGroup = ({ label, options }: ToolbarToggleGroupProps) => {
  return (
    <div style={toolbarToggleWrapStyle}>
      <span style={{ fontSize: 12, color: adminTheme.color.textMuted, fontWeight: 700 }}>{label}</span>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          style={{
            ...toolbarToggleButtonStyle,
            background: option.active ? adminTheme.color.primary : adminTheme.color.surface,
            color: option.active ? adminTheme.color.primaryText : adminTheme.color.text,
            borderColor: option.active ? adminTheme.color.primary : adminTheme.color.border,
          }}
          onClick={option.onToggle}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

type FilterToolbarProps = {
  children: ReactNode
  onClear?: () => void
  clearLabel?: string
}

const FilterToolbar = ({ children, onClear, clearLabel = "Clear Filters" }: FilterToolbarProps) => {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
      {children}
      {onClear ? (
        <button type="button" style={toolbarInputStyle} onClick={onClear}>
          {clearLabel}
        </button>
      ) : null}
    </div>
  )
}

export default FilterToolbar
