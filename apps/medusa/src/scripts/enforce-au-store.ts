import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  deleteRegionsWorkflow,
  updateRegionsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

type RegionLike = {
  id: string
  name?: string | null
  currency_code?: string | null
  countries?: Array<{ iso_2?: string | null }> | null
}

export default async function enforceAuStore({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id"],
  })
  const store = stores?.[0]
  if (!store?.id) {
    throw new Error("Store not found")
  }

  const { data: regionData } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  })
  const regions = (regionData ?? []) as RegionLike[]

  const auRegion =
    regions.find((region) =>
      (region.countries ?? []).some((country) => country.iso_2?.toLowerCase() === "au")
    ) ??
    regions.find((region) => region.currency_code?.toLowerCase() === "aud")

  let auRegionId = auRegion?.id

  if (!auRegionId) {
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
    auRegionId = result[0]?.id
    if (!auRegionId) {
      throw new Error("Failed to create Australia region")
    }
    logger.info(`Created Australia region: ${auRegionId}`)
  } else {
    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: auRegionId },
        update: {
          name: "Australia",
          currency_code: "aud",
          countries: ["au"],
          payment_providers: ["pp_system_default"],
        },
      },
    })
    logger.info(`Updated Australia region: ${auRegionId}`)
  }

  const extraRegionIds = regions.map((r) => r.id).filter((id) => id !== auRegionId)
  if (extraRegionIds.length) {
    try {
      await deleteRegionsWorkflow(container).run({
        input: { ids: extraRegionIds },
      })
      logger.info(`Removed non-AU regions: ${extraRegionIds.join(", ")}`)
    } catch (error) {
      logger.warn(
        `Could not remove some non-AU regions (may be referenced by existing data): ${extraRegionIds.join(", ")}`
      )
    }
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [{ currency_code: "aud", is_default: true }],
      },
    },
  })

  logger.info("Store currency set to AUD only (default)")
  logger.info(`Store region target: Australia (${auRegionId})`)
}
