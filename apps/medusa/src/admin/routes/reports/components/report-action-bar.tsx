import { toolbarInputStyle } from "./filter-toolbar"
import { adminTheme } from "../../../lib/admin-theme"

type ReportAction =
  | {
      key: string
      label: string
      onClick: () => void
      disabled?: boolean
    }
  | {
      key: string
      label: string
      href: string
    }

type ReportActionBarProps = {
  actions: ReportAction[]
  status?: {
    tone: "info" | "success" | "error"
    message: string
  } | null
}

const ReportActionBar = ({ actions, status }: ReportActionBarProps) => {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      {actions.map((action) =>
        "href" in action ? (
          <a
            key={action.key}
            href={action.href}
            style={{
              ...toolbarInputStyle,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {action.label}
          </a>
        ) : (
          <button
            key={action.key}
            type="button"
            style={toolbarInputStyle}
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.label}
          </button>
        )
      )}
      {status ? (
        <span
          style={{
            ...toolbarInputStyle,
            cursor: "default",
            borderColor:
              status.tone === "success"
                ? adminTheme.color.success
                : status.tone === "error"
                  ? adminTheme.color.danger
                  : adminTheme.color.info,
            background:
              status.tone === "success"
                ? adminTheme.color.successSoft
                : status.tone === "error"
                  ? adminTheme.color.dangerSoft
                  : adminTheme.color.infoSoft,
            color:
              status.tone === "success"
                ? adminTheme.color.success
                : status.tone === "error"
                  ? adminTheme.color.danger
                  : adminTheme.color.info,
            fontWeight: 600,
          }}
        >
          {status.message}
        </span>
      ) : null}
    </div>
  )
}

export default ReportActionBar
