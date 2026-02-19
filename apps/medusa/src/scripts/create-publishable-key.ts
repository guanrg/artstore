import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"

export default async function createPublishableKey({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: channels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
    filters: { name: "Default Sales Channel" },
  })

  if (!channels?.length) {
    throw new Error(
      'No "Default Sales Channel" found. Run migrations/seed first (npm run seed).'
    )
  }

  const {
    result: [apiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: `Storefront ${new Date().toISOString()}`,
          type: "publishable",
          created_by: "cli",
        },
      ],
    },
  })

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: apiKey.id,
      add: [channels[0].id],
    },
  })

  logger.info(`Created publishable key id: ${apiKey.id}`)
  logger.info(`PUBLISHABLE_KEY=${apiKey.token}`)
}
