import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductVariantsWorkflow, updateStoresWorkflow } from "@medusajs/medusa/core-flows"

export default async function migrateStoreToAu({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "supported_currencies.currency_code", "supported_currencies.is_default"],
  })

  const store = stores?.[0]
  if (!store?.id) {
    throw new Error("Store not found")
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [{ currency_code: "aud", is_default: true }],
      },
    },
  })
  logger.info("Store currency updated: AUD (default)")

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id"],
  })

  const variantIds: string[] = (variants ?? []).map((v: any) => v.id).filter(Boolean)
  if (variantIds.length === 0) {
    logger.info("No variants found. Skipping variant price migration.")
    return
  }

  const batchSize = 50
  for (let i = 0; i < variantIds.length; i += batchSize) {
    const batch = variantIds.slice(i, i + batchSize)
    await updateProductVariantsWorkflow(container).run({
      input: {
        product_variants: batch.map((id) => ({
          id,
          prices: [
            {
              amount: 15,
              currency_code: "aud",
            },
          ],
        })),
      },
    })
    logger.info(`AUD prices upserted for variants: ${i + 1}-${Math.min(i + batchSize, variantIds.length)}`)
  }

  logger.info("AU migration completed.")
}
