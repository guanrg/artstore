import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules, ProductStatus } from "@medusajs/framework/utils";
import {
  createProductsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";

type YahooImportBody = {
  url?: string;
  price_aud?: number;
  publish?: boolean;
  translate?: boolean;
  target_lang?: string;
};

type ParsedYahooAuction = {
  auctionId: string;
  title: string;
  description: string;
  imageUrls: string[];
  priceJpy?: number;
};

type TranslationResult = {
  title: string;
  description: string;
  provider: "openai";
  sourceLang: string;
  targetLang: string;
};

const YAHOO_HOST = "auctions.yahoo.co.jp";

function normalizeLanguageTag(input?: string): string {
  if (!input) {
    return "zh-CN";
  }
  return input.trim() || "zh-CN";
}

async function translateWithOpenAI(params: {
  title: string;
  description: string;
  sourceLang: string;
  targetLang: string;
}): Promise<TranslationResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_TRANSLATE_MODEL || "gpt-4o-mini";
  const instruction =
    `Translate product content from ${params.sourceLang} to ${params.targetLang}. ` +
    "Keep brand/model codes unchanged. Return strict JSON only: " +
    '{"title":"...","description":"..."}';

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: instruction,
        },
        {
          role: "user",
          content: JSON.stringify({
            title: params.title,
            description: params.description,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Translation failed (${response.status})`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Translation failed: empty model response");
  }

  const parsed = JSON.parse(content) as { title?: string; description?: string };
  const translatedTitle = normalizeText(parsed.title);
  const translatedDescription = normalizeText(parsed.description);
  if (!translatedTitle || !translatedDescription) {
    throw new Error("Translation failed: invalid JSON payload");
  }

  return {
    title: translatedTitle,
    description: translatedDescription,
    provider: "openai",
    sourceLang: params.sourceLang,
    targetLang: params.targetLang,
  };
}

function decodeHtml(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, " ");
}

function normalizeText(input?: string): string {
  if (!input) {
    return "";
  }

  return decodeHtml(stripTags(input)).replace(/\s+/g, " ").trim();
}

function pickMetaContent(html: string, key: string): string | undefined {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["'][^>]*>`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return normalizeText(match[1]);
    }
  }

  return undefined;
}

function firstNumberMatch(content: string, patterns: RegExp[]): number | undefined {
  for (const pattern of patterns) {
    const match = content.match(pattern);
    const raw = match?.[1];
    if (!raw) {
      continue;
    }

    const numeric = Number(raw.replace(/[^\d]/g, ""));
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }

  return undefined;
}

function extractYahooImages(html: string, ogImage?: string): string[] {
  const urls = new Set<string>();

  if (ogImage && /^https?:\/\//i.test(ogImage) && isLikelyProductImage(ogImage)) {
    urls.add(cleanYahooImageUrl(ogImage));
  }

  const regexes = [
    /"imgHref"\s*:\s*"([^"]+)"/gi,
    /"imageUrl"\s*:\s*"([^"]+)"/gi,
    /"fullImageUrl"\s*:\s*"([^"]+)"/gi,
    /<img[^>]+src=["']([^"']+)["']/gi,
    /<source[^>]+srcset=["']([^"']+)["']/gi,
  ];

  for (const regex of regexes) {
    let match: RegExpExecArray | null = regex.exec(html);
    while (match) {
      const raw = decodeHtml(match[1] || "").replace(/\\\//g, "/").trim();
      if (/^https?:\/\//i.test(raw) && !raw.includes("/icon/")) {
        const base = raw.split(",")[0].trim().split(" ")[0].trim();
        if (isLikelyProductImage(base)) {
          urls.add(cleanYahooImageUrl(base));
        }
      }
      match = regex.exec(html);
    }
  }

  return Array.from(urls).slice(0, 20);
}

function cleanYahooImageUrl(input: string): string {
  try {
    const u = new URL(input);
    // Strip tracking/thumb params to keep cleaner source image URLs.
    u.searchParams.delete("nf_src");
    u.searchParams.delete("nf_path");
    u.searchParams.delete("nf_st");
    u.searchParams.delete("tag");
    u.searchParams.delete("w");
    u.searchParams.delete("h");
    u.searchParams.delete("up");
    return u.toString();
  } catch {
    return input;
  }
}

function isLikelyProductImage(input: string): boolean {
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return false;
  }

  const host = u.hostname.toLowerCase();
  const path = u.pathname.toLowerCase();
  const href = u.toString().toLowerCase();

  if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(href)) {
    return false;
  }

  // Exclude avatar/ad/cropped-preview hosts and known noisy params.
  if (host.includes("displayname-pctr.c.yimg.jp") || host.includes("auc-pctr.c.yimg.jp")) {
    return false;
  }
  if (href.includes("nf_src=") || href.includes("/d/display-name/")) {
    return false;
  }

  // Keep only auction product image origins/paths.
  if (host === "images.auctions.yahoo.co.jp" && path.includes("/image/")) {
    return true;
  }
  if (host === "auctions.c.yimg.jp" && path.includes("/images.auctions.yahoo.co.jp/image/")) {
    return true;
  }
  if (host === "auctions.afimg.jp" && path.includes("/image/")) {
    return true;
  }

  return false;
}

function parseAuctionPage(url: URL, html: string): ParsedYahooAuction {
  const pathMatch = url.pathname.match(/\/auction\/([a-zA-Z0-9]+)/);
  if (!pathMatch?.[1]) {
    throw new Error("Cannot parse auction ID from URL");
  }
  const auctionId = pathMatch[1];

  const ogTitle = pickMetaContent(html, "og:title");
  const ogDescription = pickMetaContent(html, "og:description");
  const ogImage = pickMetaContent(html, "og:image");
  const imageUrls = extractYahooImages(html, ogImage);
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];

  const title = normalizeText(ogTitle || titleTag || `Yahoo Auction ${auctionId}`);
  const description = normalizeText(
    ogDescription || `Imported from Yahoo Auctions: ${url.toString()}`
  );

  const priceJpy = firstNumberMatch(html, [
    /"currentPrice"\s*:\s*"?(?:JPY)?\s*([\d,]+)"?/i,
    /"bidOrBuyPrice"\s*:\s*"?(?:JPY)?\s*([\d,]+)"?/i,
    /"price"\s*:\s*"?(?:JPY)?\s*([\d,]+)"?/i,
    /"currentPriceValue"\s*:\s*"?(?:JPY)?\s*([\d,]+)"?/i,
  ]);

  return {
    auctionId,
    title,
    description,
    imageUrls,
    priceJpy,
  };
}

function toHandle(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function convertJpyToAudAmountCents(jpy?: number): number {
  if (!jpy || !Number.isFinite(jpy) || jpy <= 0) {
    return 10000;
  }

  // Business rule: Yahoo JPY price / 10 => AUD.
  const aud = Math.max(1, Math.round(jpy / 10));
  return aud * 100;
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const body = (req.body ?? {}) as YahooImportBody;
    const urlInput = body.url?.trim();

    if (!urlInput) {
      return res.status(400).json({ message: "Missing URL" });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(urlInput);
    } catch {
      return res.status(400).json({ message: "Invalid URL format" });
    }

    const isYahooAuction =
      parsedUrl.hostname === YAHOO_HOST && /\/auction\/[a-zA-Z0-9]+/.test(parsedUrl.pathname);

    if (!isYahooAuction) {
      return res.status(400).json({
        message: "Only auctions.yahoo.co.jp auction detail URLs are supported",
      });
    }

    const upstream = await fetch(parsedUrl.toString(), {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });

    if (!upstream.ok) {
      return res.status(502).json({
        message: `Failed to fetch Yahoo page (${upstream.status})`,
      });
    }

    const html = await upstream.text();
    const parsed = parseAuctionPage(parsedUrl, html);
    const shouldTranslate = body.translate !== false;
    const sourceLang = normalizeLanguageTag(process.env.YAHOO_TRANSLATE_SOURCE_LANG || "ja");
    const targetLang = normalizeLanguageTag(
      body.target_lang || process.env.YAHOO_TRANSLATE_TARGET_LANG || "zh-CN"
    );

    let translated: TranslationResult | null = null;
    let translationError: string | null = null;
    if (shouldTranslate) {
      try {
        translated = await translateWithOpenAI({
          title: parsed.title,
          description: parsed.description,
          sourceLang,
          targetLang,
        });
      } catch (error: unknown) {
        const err = error as { message?: string };
        translationError = err?.message || "Translation failed";
      }
    }

    const fulfillmentService = req.scope.resolve(Modules.FULFILLMENT);
    const salesChannelService = req.scope.resolve(Modules.SALES_CHANNEL);
    const storeService = req.scope.resolve(Modules.STORE);
    const query = req.scope.resolve("query");

    const shippingProfiles = await fulfillmentService.listShippingProfiles({ type: "default" });
    const shippingProfileId = shippingProfiles[0]?.id;

    if (!shippingProfileId) {
      return res.status(400).json({
        message: "Default shipping profile not found. Run seed first.",
      });
    }

    const [store] = await storeService.listStores();
    const fallbackSalesChannels = await salesChannelService.listSalesChannels({});
    const salesChannelId = store?.default_sales_channel_id || fallbackSalesChannels[0]?.id;
    const defaultLocationId = store?.default_location_id;

    if (salesChannelId && defaultLocationId) {
      await linkSalesChannelsToStockLocationWorkflow(req.scope).run({
        input: {
          id: defaultLocationId,
          add: [salesChannelId],
        },
      });
    }

    const stableExternalId = `yahoo:${parsed.auctionId}`;
    const stableHandle = toHandle(`yahoo-${parsed.auctionId}`) || `yahoo-${parsed.auctionId}`;

    const { data: existingByExternalId } = await query.graph({
      entity: "product",
      fields: ["id", "handle", "external_id", "variants.id"],
      filters: { external_id: stableExternalId },
    });
    const { data: existingByHandle } = existingByExternalId?.length
      ? { data: [] as any[] }
      : await query.graph({
          entity: "product",
          fields: ["id", "handle", "external_id", "variants.id"],
          filters: { handle: stableHandle },
        });

    const existingProduct = (existingByExternalId?.[0] || existingByHandle?.[0]) as
      | { id: string; variants?: { id: string }[] }
      | undefined;

    const overridePrice = Number(body.price_aud);
    const amount = Number.isFinite(overridePrice) && overridePrice > 0
      ? Math.round(overridePrice * 100)
      : convertJpyToAudAmountCents(parsed.priceJpy);

    const skuSuffix = Date.now().toString().slice(-6);

    const translatedTitle = translated?.title;
    const translatedDescription = translated?.description;

    const baseProductData = {
      title: translatedTitle || parsed.title,
      subtitle: parsed.title,
      handle: stableHandle,
      external_id: stableExternalId,
      description: translatedDescription || parsed.description,
      status: body.publish === false ? ProductStatus.DRAFT : ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfileId,
      metadata: {
        source: "yahoo_auctions",
        source_url: parsedUrl.toString(),
        source_auction_id: parsed.auctionId,
        source_price_jpy: parsed.priceJpy ?? null,
        source_title_original: parsed.title,
        source_description_original: parsed.description,
        translated_title: translatedTitle ?? null,
        translated_description: translatedDescription ?? null,
        translation_provider: translated?.provider ?? null,
        translation_source_lang: translated?.sourceLang ?? null,
        translation_target_lang: translated?.targetLang ?? null,
        translation_error: translationError,
      },
    };

    const images = parsed.imageUrls.map((url) => ({ url }));
    const salesChannels = salesChannelId ? [{ id: salesChannelId }] : undefined;

    let productId = "";
    let productTitle = translatedTitle || parsed.title;
    let productHandle = stableHandle;
    let mode: "created" | "updated" = "created";

    if (existingProduct?.id) {
      mode = "updated";
      const existingVariantId = existingProduct.variants?.[0]?.id;
      const updatePayload: any = {
        ...baseProductData,
        images,
        sales_channels: salesChannels,
      };
      if (existingVariantId) {
        updatePayload.variants = [
          {
            id: existingVariantId,
            title: "Default",
            sku: `YAHOO-${parsed.auctionId}-${skuSuffix}`,
            manage_inventory: false,
            allow_backorder: true,
            prices: [
              {
                currency_code: "aud",
                amount,
              },
            ],
          },
        ];
      }

      const { result } = await updateProductsWorkflow(req.scope).run({
        input: {
          selector: { id: existingProduct.id },
          update: updatePayload,
        },
      });
      productId = result[0]?.id;
      productTitle = result[0]?.title ?? parsed.title;
      productHandle = result[0]?.handle ?? stableHandle;
    } else {
      const createPayload: any = {
        ...baseProductData,
        images,
        sales_channels: salesChannels,
        options: [
          {
            title: "Condition",
            values: ["Auction Import"],
          },
        ],
        variants: [
          {
            title: "Default",
            sku: `YAHOO-${parsed.auctionId}-${skuSuffix}`,
            manage_inventory: false,
            allow_backorder: true,
            options: {
              Condition: "Auction Import",
            },
            prices: [
              {
                currency_code: "aud",
                amount,
              },
            ],
          },
        ],
      };

      const { result } = await createProductsWorkflow(req.scope).run({
        input: {
          products: [createPayload],
        },
      });
      productId = result[0]?.id;
      productTitle = result[0]?.title ?? parsed.title;
      productHandle = result[0]?.handle ?? stableHandle;
    }

    return res.status(200).json({
      message: mode === "updated" ? "Import successful (updated existing product)" : "Import successful",
      product: {
        id: productId,
        title: productTitle,
        handle: productHandle,
      },
      mode,
      parsed: {
        auction_id: parsed.auctionId,
        original_title: parsed.title,
        translated_title: translatedTitle ?? null,
        price_jpy: parsed.priceJpy ?? null,
        image_count: parsed.imageUrls.length,
        image_urls: parsed.imageUrls,
        translation_error: translationError,
      },
    });
  } catch (e: unknown) {
    const errorObject = e as { message?: string; code?: string; detail?: string };
    const message =
      errorObject?.detail ||
      errorObject?.message ||
      "Import failed";
    return res.status(500).json({ message });
  }
}
