import { toolbarInputStyle } from "./filter-toolbar"

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
                ? "#b7e0c2"
                : status.tone === "error"
                  ? "#f2c7c7"
                  : "#c6d7f4",
            background:
              status.tone === "success"
                ? "#e8f7ec"
                : status.tone === "error"
                  ? "#fdecec"
                  : "#e8f0fb",
            color:
              status.tone === "success"
                ? "#166534"
                : status.tone === "error"
                  ? "#b42318"
                  : "#173f8a",
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
