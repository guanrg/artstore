import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
  createSalesChannelsWorkflow,
  createShippingProfilesWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows"

type SampleProduct = {
  title: string
  handle: string
  description: string
  images: string[]
  options: { title: string; values: string[] }[]
  variants: {
    title: string
    sku: string
    options: Record<string, string>
    prices: { amount: number; currency_code: string }[]
  }[]
}

const sampleProducts: SampleProduct[] = [
  {
    title: "Neon Drift Jacket",
    handle: "neon-drift-jacket",
    description:
      "Lightweight street jacket with reflective trim and water-resistant shell. Built for evening city rides and windy commutes.",
    images: [
      "https://picsum.photos/seed/neon-drift-jacket-1/1400/1800",
      "https://picsum.photos/seed/neon-drift-jacket-2/1400/1800",
    ],
    options: [
      { title: "Size", values: ["S", "M", "L", "XL"] },
      { title: "Color", values: ["Volt", "Charcoal"] },
    ],
    variants: [
      {
        title: "S / Volt",
        sku: "NDJ-S-VOLT",
        options: { Size: "S", Color: "Volt" },
        prices: [
          { amount: 18900, currency_code: "aud" },
          { amount: 12900, currency_code: "usd" },
          { amount: 11900, currency_code: "eur" },
        ],
      },
      {
        title: "M / Volt",
        sku: "NDJ-M-VOLT",
        options: { Size: "M", Color: "Volt" },
        prices: [
          { amount: 18900, currency_code: "aud" },
          { amount: 12900, currency_code: "usd" },
          { amount: 11900, currency_code: "eur" },
        ],
      },
      {
        title: "L / Charcoal",
        sku: "NDJ-L-CHAR",
        options: { Size: "L", Color: "Charcoal" },
        prices: [
          { amount: 18900, currency_code: "aud" },
          { amount: 12900, currency_code: "usd" },
          { amount: 11900, currency_code: "eur" },
        ],
      },
      {
        title: "XL / Charcoal",
        sku: "NDJ-XL-CHAR",
        options: { Size: "XL", Color: "Charcoal" },
        prices: [
          { amount: 18900, currency_code: "aud" },
          { amount: 12900, currency_code: "usd" },
          { amount: 11900, currency_code: "eur" },
        ],
      },
    ],
  },
  {
    title: "Aurora Ceramic Mug Set",
    handle: "aurora-ceramic-mug-set",
    description:
      "Set of two hand-finished mugs with iridescent glaze. Designed for coffee rituals and bright kitchen shelves.",
    images: [
      "https://picsum.photos/seed/aurora-mug-set-1/1400/1800",
      "https://picsum.photos/seed/aurora-mug-set-2/1400/1800",
    ],
    options: [{ title: "Style", values: ["Dawn", "Dusk"] }],
    variants: [
      {
        title: "Dawn",
        sku: "MUG-DAWN",
        options: { Style: "Dawn" },
        prices: [
          { amount: 5900, currency_code: "aud" },
          { amount: 3900, currency_code: "usd" },
          { amount: 3500, currency_code: "eur" },
        ],
      },
      {
        title: "Dusk",
        sku: "MUG-DUSK",
        options: { Style: "Dusk" },
        prices: [
          { amount: 5900, currency_code: "aud" },
          { amount: 3900, currency_code: "usd" },
          { amount: 3500, currency_code: "eur" },
        ],
      },
    ],
  },
  {
    title: "Atlas Trail Backpack 28L",
    handle: "atlas-trail-backpack-28l",
    description:
      "Commuter-ready backpack with laptop sleeve, hidden pocket, and modular straps. Durable shell with clean outdoor styling.",
    images: [
      "https://picsum.photos/seed/atlas-backpack-1/1400/1800",
      "https://picsum.photos/seed/atlas-backpack-2/1400/1800",
    ],
    options: [{ title: "Color", values: ["Forest", "Sand", "Onyx"] }],
    variants: [
      {
        title: "Forest",
        sku: "ATB-FOREST",
        options: { Color: "Forest" },
        prices: [
          { amount: 14900, currency_code: "aud" },
          { amount: 9900, currency_code: "usd" },
          { amount: 8900, currency_code: "eur" },
        ],
      },
      {
        title: "Sand",
        sku: "ATB-SAND",
        options: { Color: "Sand" },
        prices: [
          { amount: 14900, currency_code: "aud" },
          { amount: 9900, currency_code: "usd" },
          { amount: 8900, currency_code: "eur" },
        ],
      },
      {
        title: "Onyx",
        sku: "ATB-ONYX",
        options: { Color: "Onyx" },
        prices: [
          { amount: 14900, currency_code: "aud" },
          { amount: 9900, currency_code: "usd" },
          { amount: 8900, currency_code: "eur" },
        ],
      },
    ],
  },
  {
    title: "Pixel Bloom Art Print",
    handle: "pixel-bloom-art-print",
    description:
      "Museum-grade giclee print with bold gradient blooms. Made for gallery walls, desks, and colorful studio corners.",
    images: [
      "https://picsum.photos/seed/pixel-bloom-print-1/1400/1800",
      "https://picsum.photos/seed/pixel-bloom-print-2/1400/1800",
    ],
    options: [
      { title: "Size", values: ["A4", "A3"] },
      { title: "Frame", values: ["No Frame", "Oak"] },
    ],
    variants: [
      {
        title: "A4 / No Frame",
        sku: "PBP-A4-NF",
        options: { Size: "A4", Frame: "No Frame" },
        prices: [
          { amount: 3600, currency_code: "aud" },
          { amount: 2400, currency_code: "usd" },
          { amount: 2200, currency_code: "eur" },
        ],
      },
      {
        title: "A4 / Oak",
        sku: "PBP-A4-OAK",
        options: { Size: "A4", Frame: "Oak" },
        prices: [
          { amount: 6200, currency_code: "aud" },
          { amount: 4200, currency_code: "usd" },
          { amount: 3900, currency_code: "eur" },
        ],
      },
      {
        title: "A3 / No Frame",
        sku: "PBP-A3-NF",
        options: { Size: "A3", Frame: "No Frame" },
        prices: [
          { amount: 4800, currency_code: "aud" },
          { amount: 3200, currency_code: "usd" },
          { amount: 2900, currency_code: "eur" },
        ],
      },
      {
        title: "A3 / Oak",
        sku: "PBP-A3-OAK",
        options: { Size: "A3", Frame: "Oak" },
        prices: [
          { amount: 7800, currency_code: "aud" },
          { amount: 5200, currency_code: "usd" },
          { amount: 4800, currency_code: "eur" },
        ],
      },
    ],
  },
]

export default async function seedShowcaseData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  })

  if (!defaultSalesChannel.length) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [{ name: "Default Sales Channel" }],
      },
    })
    defaultSalesChannel = result
    logger.info('Created missing "Default Sales Channel".')
  }

  let shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  })

  if (!shippingProfiles.length) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: {
        data: [
          {
            name: "Default Shipping Profile",
            type: "default",
          },
        ],
      },
    })
    shippingProfiles = result
    logger.info('Created missing "Default Shipping Profile".')
  }
  const shippingProfile = shippingProfiles[0]

  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "variants.id", "variants.sku"],
  })
  const existingByHandle = new Map((existingProducts ?? []).map((p) => [p.handle, p]))
  const existingHandles = new Set(existingByHandle.keys())

  const productsToCreate = sampleProducts
    .filter((p) => !existingHandles.has(p.handle))
    .map((p) => ({
      title: p.title,
      handle: p.handle,
      description: p.description,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      images: p.images.map((url) => ({ url })),
      options: p.options,
      variants: p.variants.map((variant) => ({
        ...variant,
        manage_inventory: false,
      })),
      sales_channels: [{ id: defaultSalesChannel[0].id }],
    }))

  if (!productsToCreate.length) {
    logger.info("Showcase products already exist. Checking AUD prices...")
  } else {
    await createProductsWorkflow(container).run({
      input: {
        products: productsToCreate,
      },
    })

    logger.info(`Seeded ${productsToCreate.length} showcase products.`)
  }

  const updates: Array<{ id: string; prices: { amount: number; currency_code: string }[]; manage_inventory: boolean }> = []
  for (const sample of sampleProducts) {
    const existing = existingByHandle.get(sample.handle)
    if (!existing?.variants?.length) continue

    const idBySku = new Map<string, string>(
      (existing.variants ?? []).map((v: any) => [String(v.sku), String(v.id)] as [string, string])
    )
    for (const variant of sample.variants) {
      const variantId = idBySku.get(variant.sku)
      if (!variantId) continue
      updates.push({
        id: String(variantId),
        prices: variant.prices,
        manage_inventory: false,
      })
    }
  }

  if (updates.length) {
    const batchSize = 20
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)
      await updateProductVariantsWorkflow(container).run({
        input: {
          product_variants: batch,
        },
      })
    }
    logger.info(`Updated ${updates.length} variants with AUD prices.`)
  }
}
