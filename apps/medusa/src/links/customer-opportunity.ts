import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"
import CrmModule from "../modules/crm"

export default defineLink(
  CrmModule.linkable.opportunity,
  CustomerModule.linkable.customer
)
