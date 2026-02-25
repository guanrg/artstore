import { useState, type CSSProperties, type FormEvent } from "react";
import { defineWidgetConfig } from "@medusajs/admin-sdk";

type ImportResponse = {
  message?: string;
  mode?: "created" | "updated";
  product?: {
    id: string;
    title: string;
    handle: string;
  };
  parsed?: {
    original_title?: string | null;
    translated_title?: string | null;
    translation_error?: string | null;
  };
};

const cardStyle: CSSProperties = {
  border: "1px solid #e6e6e6",
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
  background: "#fff",
};

const inputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #d0d0d0",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 14,
  marginTop: 6,
};

const buttonStyle: CSSProperties = {
  border: "none",
  borderRadius: 6,
  padding: "8px 14px",
  background: "#111827",
  color: "#fff",
  cursor: "pointer",
  fontSize: 14,
};

const YahooImportWidget = () => {
  const [url, setUrl] = useState("");
  const [priceAud, setPriceAud] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [translateEnabled, setTranslateEnabled] = useState(true);
  const [targetLang, setTargetLang] = useState("zh-CN");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload: Record<string, unknown> = {
        url: url.trim(),
        publish: true,
        translate: translateEnabled,
      };

      if (priceAud.trim()) {
        payload.price_aud = Number(priceAud);
      }
      if (targetLang.trim()) {
        payload.target_lang = targetLang.trim();
      }

      const response = await fetch("/admin/custom/yahoo-import", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let data: ImportResponse = {};
      try {
        data = (await response.json()) as ImportResponse;
      } catch {
        // keep empty object for non-JSON error bodies
      }

      if (!response.ok) {
        throw new Error(data.message || `Import failed (${response.status})`);
      }

      const originalTitle = data.parsed?.original_title;
      const translatedTitle = data.parsed?.translated_title;
      const shownTitle = translatedTitle || data.product?.title || "";
      const suffix = originalTitle && translatedTitle
        ? ` | Original: ${originalTitle}`
        : "";
      const warn = data.parsed?.translation_error
        ? ` | Translation warning: ${data.parsed.translation_error}`
        : "";

      setSuccess(
        `${data.mode === "updated" ? "Updated" : "Imported"}: ${shownTitle} (${data.product?.id ?? "unknown"})${suffix}${warn}`
      );
      setUrl("");
      setPriceAud("");
      setTimeout(() => {
        window.location.assign(`/app/products?imported=${Date.now()}`);
      }, 250);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: 0, fontSize: 16 }}>Yahoo Auction Import</h3>
      <p style={{ marginTop: 8, marginBottom: 12, color: "#4b5563", fontSize: 13 }}>
        Paste a Yahoo auction URL to fetch details and create a product (AUD price).
      </p>
      <form onSubmit={handleSubmit}>
        <label style={{ fontSize: 13 }}>
          Yahoo URL
          <input
            required
            type="url"
            style={inputStyle}
            placeholder="https://auctions.yahoo.co.jp/jp/auction/f1220292543"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>

        <label style={{ fontSize: 13, marginTop: 12, display: "block" }}>
          Override price (AUD, optional)
          <input
            type="number"
            min="0"
            step="0.01"
            style={inputStyle}
            placeholder="Leave empty to auto-estimate"
            value={priceAud}
            onChange={(e) => setPriceAud(e.target.value)}
          />
        </label>

        <label style={{ fontSize: 13, marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={translateEnabled}
            onChange={(e) => setTranslateEnabled(e.target.checked)}
          />
          Auto translate title/description
        </label>

        <label style={{ fontSize: 13, marginTop: 12, display: "block" }}>
          Target language (BCP-47, e.g. zh-CN / en / fr)
          <input
            type="text"
            style={inputStyle}
            placeholder="zh-CN"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
          />
        </label>

        <div style={{ marginTop: 12 }}>
          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? "Importing..." : "Import Product"}
          </button>
        </div>
      </form>

      {error ? (
        <p style={{ marginTop: 12, color: "#b42318", fontSize: 13 }}>{error}</p>
      ) : null}
      {success ? (
        <p style={{ marginTop: 12, color: "#067647", fontSize: 13 }}>{success}</p>
      ) : null}
    </div>
  );
};

export const config = defineWidgetConfig({
  zone: "product.list.before",
});

export default YahooImportWidget;
