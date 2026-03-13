import type { CSSProperties, ReactNode } from "react"

export const toolbarInputStyle: CSSProperties = {
  border: "1px solid #cad7e6",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 13,
  background: "#ffffff",
  color: "#17304d",
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
      <span style={{ fontSize: 12, color: "#607086", fontWeight: 600 }}>{label}</span>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          style={{
            ...toolbarToggleButtonStyle,
            background: option.active ? "#173f8a" : "#ffffff",
            color: option.active ? "#ffffff" : "#17304d",
            borderColor: option.active ? "#173f8a" : "#cad7e6",
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
}

const FilterToolbar = ({ children, onClear }: FilterToolbarProps) => {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
      {children}
      {onClear ? (
        <button type="button" style={toolbarInputStyle} onClick={onClear}>
          Clear Filters
        </button>
      ) : null}
    </div>
  )
}

export default FilterToolbar
