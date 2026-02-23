import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { linkSalesChannelsToStockLocationWorkflow } from "@medusajs/medusa/core-flows"

export default async function fixSalesChannelStockLinks({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "default_location_id", "default_sales_channel_id"],
  })

  const store = stores?.[0]
  if (!store?.id) {
    throw new Error("Store not found")
  }
  if (!store.default_location_id) {
    throw new Error("Store default_location_id is missing. Run seed/setup first.")
  }

  const { data: channels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })

  const channelIds = (channels ?? []).map((c: any) => c.id).filter(Boolean)
  if (!channelIds.length) {
    throw new Error("No sales channels found")
  }

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: store.default_location_id,
      add: channelIds,
    },
  })

  logger.info(
    `Linked ${channelIds.length} sales channel(s) to stock location ${store.default_location_id}`
  )
}

