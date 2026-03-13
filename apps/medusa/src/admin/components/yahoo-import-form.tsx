import { useMemo, useState, type CSSProperties, type FormEvent } from "react"
import { adminCardStyle, adminTheme } from "../lib/admin-theme"
import { useAdminLanguage } from "../lib/admin-language"

type ImportResponse = {
  message?: string
  mode?: "created" | "updated"
  product?: {
    id: string
    title: string
    handle: string
  }
  parsed?: {
    original_title?: string | null
    translated_title?: string | null
    translation_error?: string | null
  }
}

type YahooImportFormProps = {
  compact?: boolean
}

const shellStyle: CSSProperties = {
  ...adminCardStyle,
  borderRadius: 18,
  padding: 18,
  display: "grid",
  gap: 14,
}

const inputStyle: CSSProperties = {
  width: "100%",
  border: `1px solid ${adminTheme.color.border}`,
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  marginTop: 6,
  background: adminTheme.color.surface,
  color: adminTheme.color.text,
  boxShadow: adminTheme.shadow.soft,
}

const buttonStyle: CSSProperties = {
  border: `1px solid ${adminTheme.color.primary}`,
  borderRadius: 999,
  padding: "10px 16px",
  background: adminTheme.color.primary,
  color: adminTheme.color.primaryText,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
  boxShadow: adminTheme.shadow.soft,
}

const checkboxStyle: CSSProperties = {
  width: 18,
  height: 18,
  border: `1.5px solid ${adminTheme.color.primary}`,
  borderRadius: 4,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1,
  userSelect: "none",
}

const linkButtonStyle: CSSProperties = {
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  border: `1px solid ${adminTheme.color.border}`,
  borderRadius: 999,
  padding: "9px 14px",
  fontSize: 13,
  fontWeight: 700,
  color: adminTheme.color.text,
  background: adminTheme.color.surfaceMuted,
  boxShadow: adminTheme.shadow.soft,
}

const YahooImportForm = ({ compact = false }: YahooImportFormProps) => {
  const { t } = useAdminLanguage()
  const [url, setUrl] = useState("")
  const [priceAud, setPriceAud] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [importedProduct, setImportedProduct] = useState<{ id: string; title: string } | null>(null)
  const [translateEnabled, setTranslateEnabled] = useState(true)
  const [targetLang, setTargetLang] = useState("zh-CN")

  const description = useMemo(
    () =>
      compact
        ? t("粘贴拍卖链接后可直接创建商品。", "Paste an auction URL to create a product.")
        : t(
            "粘贴 Yahoo 拍卖链接，抓取商品信息并创建商品。可选覆盖澳元价格，并自动翻译标题和描述。",
            "Paste a Yahoo auction URL to fetch details and create a product. Optionally override AUD pricing and auto-translate the title and description."
          ),
    [compact, t]
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")
    setImportedProduct(null)

    try {
      const payload: Record<string, unknown> = {
        url: url.trim(),
        publish: true,
        translate: translateEnabled,
      }

      if (priceAud.trim()) {
        payload.price_aud = Number(priceAud)
      }
      if (targetLang.trim()) {
        payload.target_lang = targetLang.trim()
      }

      const response = await fetch("/admin/custom/yahoo-import", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      let data: ImportResponse = {}
      try {
        data = (await response.json()) as ImportResponse
      } catch {
        data = {}
      }

      if (!response.ok) {
        throw new Error(data.message || t(`导入失败（${response.status}）`, `Import failed (${response.status})`))
      }

      const originalTitle = data.parsed?.original_title
      const translatedTitle = data.parsed?.translated_title
      const shownTitle = translatedTitle || data.product?.title || ""
      const suffix =
        originalTitle && translatedTitle ? t(` | 原标题：${originalTitle}`, ` | Original: ${originalTitle}`) : ""
      const warn = data.parsed?.translation_error
        ? t(` | 翻译警告：${data.parsed.translation_error}`, ` | Translation warning: ${data.parsed.translation_error}`)
        : ""

      setImportedProduct(
        data.product?.id
          ? {
              id: data.product.id,
              title: shownTitle || data.product.title || data.product.id,
            }
          : null
      )
      setSuccess(
        `${data.mode === "updated" ? t("已更新", "Updated") : t("已导入", "Imported")}: ${shownTitle || t("未命名商品", "Untitled product")} (${data.product?.id ?? t("未知", "unknown")})${suffix}${warn}`
      )
      setUrl("")
      setPriceAud("")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("导入失败", "Import failed"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={shellStyle}>
      <div style={{ display: "grid", gap: 6 }}>
        <h3 style={{ margin: 0, fontSize: compact ? 16 : 18, color: adminTheme.color.text }}>
          {t("Yahoo 拍卖导入", "Yahoo Auction Import")}
        </h3>
        <p style={{ margin: 0, color: adminTheme.color.textMuted, fontSize: 13, lineHeight: 1.6 }}>{description}</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ fontSize: 13 }}>
          {t("Yahoo 链接", "Yahoo URL")}
          <input
            required
            type="url"
            style={inputStyle}
            placeholder="https://auctions.yahoo.co.jp/jp/auction/f1220292543"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <label style={{ fontSize: 13 }}>
            {t("覆盖价格（AUD，可选）", "Override price (AUD, optional)")}
            <input
              type="number"
              min="0"
              step="0.01"
              style={inputStyle}
              placeholder={t("留空则自动估算", "Leave empty to auto-estimate")}
              value={priceAud}
              onChange={(event) => setPriceAud(event.target.value)}
            />
          </label>

          <label style={{ fontSize: 13 }}>
            {t("目标语言（BCP-47）", "Target language (BCP-47)")}
            <input
              type="text"
              style={inputStyle}
              placeholder="zh-CN"
              value={targetLang}
              onChange={(event) => setTargetLang(event.target.value)}
            />
          </label>
        </div>

        <label
          style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", width: "fit-content" }}
        >
          <input
            type="checkbox"
            checked={translateEnabled}
            onChange={(event) => setTranslateEnabled(event.target.checked)}
            style={{
              ...checkboxStyle,
              appearance: "none",
              background: translateEnabled ? adminTheme.color.primary : adminTheme.color.surface,
              color: adminTheme.color.primaryText,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: "12px 12px",
              backgroundImage: translateEnabled
                ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\' fill=\'none\' stroke=\'white\' stroke-width=\'3\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M4 10l4 4 8-8\'/%3E%3C/svg%3E")'
                : "none",
              cursor: "pointer",
              margin: 0,
            }}
          />
          <span>{t("自动翻译标题 / 描述", "Auto translate title / description")}</span>
        </label>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button type="submit" style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? t("导入中...", "Importing...") : t("导入商品", "Import Product")}
          </button>
          <a href="/app/products" style={linkButtonStyle}>
            {t("查看商品列表", "Open product list")}
          </a>
        </div>
      </form>

      {error ? <p style={{ margin: 0, color: adminTheme.color.danger, fontSize: 13 }}>{error}</p> : null}
      {success ? <p style={{ margin: 0, color: adminTheme.color.success, fontSize: 13 }}>{success}</p> : null}
      {importedProduct ? (
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            padding: "12px 14px",
            borderRadius: 14,
            background: adminTheme.color.successSoft,
            border: `1px solid ${adminTheme.color.success}`,
          }}
        >
          <div style={{ fontSize: 13, color: adminTheme.color.text }}>
            {t("已生成商品：", "Created product: ")}
            <strong>{importedProduct.title}</strong>
          </div>
          <a href={`/app/products/${importedProduct.id}`} style={linkButtonStyle}>
            {t("打开商品详情", "Open product")}
          </a>
        </div>
      ) : null}
    </div>
  )
}

export default YahooImportForm
