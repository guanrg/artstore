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

  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({ type: "default" })
  const shippingProfile = shippingProfiles[0]
  if (!shippingProfile) {
    throw new Error("No default shipping profile found")
  }

  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  const stockLocation = stockLocations?.[0]
  if (!stockLocation) {
    throw new Error("No stock location found. Run seed first.")
  }

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Australia Warehouse delivery",
    type: "shipping",
    service_zones: [
      {
        name: "Australia",
        geo_zones: [{ country_code: "au", type: "country" }],
      },
    ],
  })
  const serviceZoneId = fulfillmentSet.service_zones?.[0]?.id
  if (!serviceZoneId) {
    throw new Error("No service zone found on created fulfillment set")
  }

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  })

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping AU",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: serviceZoneId,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard AU",
          description: "Ship in 2-5 business days.",
          code: "standard-au",
        },
        prices: [
          { currency_code: "aud", amount: 15 },
          { region_id: auRegion.id, amount: 15 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  })

  logger.info("Created AU shipping option")
  logger.info("AU checkout setup completed.")
}
