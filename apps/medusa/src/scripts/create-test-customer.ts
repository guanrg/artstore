import { ExecArgs } from "@medusajs/framework/types"
  import { Modules } from "@medusajs/framework/utils"

  export default async function ({ container }: ExecArgs) {
    const customerModuleService = container.resolve(Modules.CUSTOMER)
    const email = `smoke-${Date.now()}@example.com`

    const customer = await customerModuleService.createCustomers({
      email,
      first_name: "Smoke",
      last_name: "Customer",
    })

    console.log(`CUSTOMER_ID=${customer.id}`)
    console.log(`CUSTOMER_EMAIL=${customer.email}`)
  }