import { model } from "@medusajs/framework/utils"
import Opportunity from "./opportunity"

export enum LeadStatus {
  NEW = "new",
  CONTACTED = "contacted",
  QUALIFIED = "qualified",
  LOST = "lost",
}

const Lead = model.define(
  {
    name: "lead",
    tableName: "crm_lead",
  },
  {
    id: model.id({ prefix: "lead" }).primaryKey(),
    name: model.text(),
    email: model.text(),
    company: model.text(),
    source: model.text(),
    status: model.enum(LeadStatus).default(LeadStatus.NEW),
    customer_id: model.text().nullable(),
    opportunities: model.hasMany(() => Opportunity, {
      mappedBy: "lead",
    }),
  }
)

export default Lead
