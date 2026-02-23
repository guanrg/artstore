import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows"

export default async function fixYahooInventory({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "metadata", "variants.id"],
  })

  const yahooProducts = (products ?? []).filter(
    (p: any) => p?.metadata?.source === "yahoo_auctions"
  )

  const variantIds: string[] = yahooProducts
    .flatMap((p: any) => p.variants ?? [])
    .map((v: any) => v.id)
    .filter(Boolean)

  if (!variantIds.length) {
    logger.info("No Yahoo imported variants found. Nothing to fix.")
    return
  }

  const batchSize = 50
  for (let i = 0; i < variantIds.length; i += batchSize) {
    const batch = variantIds.slice(i, i + batchSize)
    await updateProductVariantsWorkflow(container).run({
      input: {
        product_variants: batch.map((id) => ({
          id,
          manage_inventory: false,
          allow_backorder: true,
        })),
      },
    })
  }

  logger.info(`Updated ${variantIds.length} Yahoo variant(s): manage_inventory=false, allow_backorder=true`)
}

