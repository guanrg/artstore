import { model } from "@medusajs/framework/utils"
import Lead from "./lead"

export enum OpportunityStage {
  PROSPECTING = "prospecting",
  NEGOTIATION = "negotiation",
  CLOSED_WON = "closed_won",
  CLOSED_LOST = "closed_lost",
}

const Opportunity = model.define(
  {
    name: "opportunity",
    tableName: "crm_opportunity",
  },
  {
    id: model.id({ prefix: "opp" }).primaryKey(),
    name: model.text(),
    estimated_amount: model.bigNumber(),
    customer_id: model.text(),
    stage: model.enum(OpportunityStage).default(OpportunityStage.PROSPECTING),
    expected_close_date: model.dateTime().nullable(),
    lead: model.belongsTo(() => Lead, {
      mappedBy: "opportunities",
    }).nullable(),
  }
)

export default Opportunity
