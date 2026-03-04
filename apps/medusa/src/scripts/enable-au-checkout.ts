import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createTaxRegionsWorkflow,
} from "@medusajs/medusa/core-flows"

type RegionCountry = {
  iso_2?: string | null
}

type RegionLike = {
  id: string
  countries?: RegionCountry[] | null
}

type ShippingOptionLike = {
  id: string
  name?: string | null
  shipping_profile_id?: string | null
  service_zone?: { id?: string | null } | null
  type?: { code?: string | null } | null
}

type ShippingProfileLike = {
  id: string
  name?: string | null
}

export default async function enableAuCheckout({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

  const { data: existingRegions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  })

  let auRegion = (existingRegions as RegionLike[]).find((region) =>
    (region.countries ?? []).some((country) => country.iso_2?.toLowerCase() === "au"),
  )

  if (!auRegion) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Australia",
            currency_code: "aud",
            countries: ["au"],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    const createdRegion = result[0] as RegionLike | undefined
    if (!createdRegion?.id) {
      throw new Error("Failed to create AU region")
    }
    auRegion = createdRegion
    logger.info(`Created AU region: ${auRegion.id}`)
  } else {
    logger.info(`AU region already exists: ${auRegion.id}`)
  }

  try {
    await createTaxRegionsWorkflow(container).run({
      input: [{ country_code: "au", provider_id: "tp_system" }],
    })
    logger.info("Created AU tax region")
  } catch {
    logger.info("AU tax region already exists or could not be created (skipped)")
  }

  const shippingProfiles = (await fulfillmentModuleService.listShippingProfiles({})) as ShippingProfileLike[]
  if (!shippingProfiles.length) {
    throw new Error("No shipping profile found")
  }

  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  const stockLocation = stockLocations?.[0]
  if (!stockLocation) {
    throw new Error("No stock location found. Run seed first.")
  }

  const { data: existingShippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "shipping_profile_id", "service_zone.id", "type.code"],
  })

  const allShippingOptions = existingShippingOptions as ShippingOptionLike[]
  const auLikeOptions = allShippingOptions.filter(
    (option) =>
      option.name?.toLowerCase() === "standard shipping au" ||
      option.type?.code?.toLowerCase().startsWith("standard-au"),
  )

  let serviceZoneId = auLikeOptions.find((option) => !!option.service_zone?.id)?.service_zone?.id ?? null
  let fulfillmentSetId: string | null = null

  if (!serviceZoneId) {
    const uniqueSuffix = Date.now().toString().slice(-6)
    const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: `Australia Warehouse delivery ${uniqueSuffix}`,
      type: "shipping",
      service_zones: [
        {
          name: `Australia ${uniqueSuffix}`,
          geo_zones: [{ country_code: "au", type: "country" }],
        },
      ],
    })
    serviceZoneId = fulfillmentSet.service_zones?.[0]?.id ?? null
    fulfillmentSetId = fulfillmentSet.id
  }

  if (!serviceZoneId) {
    throw new Error("No AU service zone available")
  }

  if (fulfillmentSetId) {
    try {
      await link.create({
        [Modules.STOCK_LOCATION]: {
          stock_location_id: stockLocation.id,
        },
        [Modules.FULFILLMENT]: {
          fulfillment_set_id: fulfillmentSetId,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      if (!message.toLowerCase().includes("already")) {
        throw error
      }
      logger.info("Stock location already linked to AU fulfillment set (skipped)")
    }
  }

  const profileIdsWithAuOption = new Set(
    auLikeOptions.map((option) => option.shipping_profile_id).filter((id): id is string => !!id),
  )

  const profilesToCreate = shippingProfiles.filter((profile) => !profileIdsWithAuOption.has(profile.id))

  if (profilesToCreate.length > 0) {
    await createShippingOptionsWorkflow(container).run({
      input: profilesToCreate.map((profile) => ({
        name: "Standard Shipping AU",
        price_type: "flat" as const,
        provider_id: "manual_manual",
        service_zone_id: serviceZoneId,
        shipping_profile_id: profile.id,
        type: {
          label: "Standard AU",
          description: "Ship in 2-5 business days.",
          code: `standard-au-${profile.id.slice(-8)}`,
        },
        prices: [
          { currency_code: "aud", amount: 15 },
          { region_id: auRegion.id, amount: 15 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
          { attribute: "is_return", value: "false", operator: "eq" as const },
        ],
      })),
    })
    logger.info(`Created AU shipping options for ${profilesToCreate.length} shipping profile(s)`)
  } else {
    logger.info("AU shipping options already exist for all shipping profiles")
  }

  logger.info("AU checkout setup completed.")
}
