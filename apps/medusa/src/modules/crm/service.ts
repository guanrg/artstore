import { MedusaError } from "@medusajs/framework/utils"
import { MedusaService } from "@medusajs/framework/utils"
import Lead, { LeadStatus } from "./models/lead"
import Opportunity, { OpportunityStage } from "./models/opportunity"

type CreateLeadInput = {
  name: string
  email: string
  company: string
  source: string
  status?: LeadStatus
  customer_id?: string | null
}

type UpdateLeadInput = Partial<CreateLeadInput> & {
  id: string
}

type CreateOpportunityInput = {
  name: string
  estimated_amount: number | string
  customer_id: string
  stage?: OpportunityStage
  expected_close_date?: Date | null
  lead_id?: string | null
}

type UpdateOpportunityInput = Partial<CreateOpportunityInput> & {
  id: string
}

type ConvertLeadInput = {
  lead_id: string
  name: string
  estimated_amount: number | string
  customer_id: string
  stage?: OpportunityStage
  expected_close_date?: Date | null
}

const LEAD_STATUS_VALUES = Object.values(LeadStatus)
const OPPORTUNITY_STAGE_VALUES = Object.values(OpportunityStage)

function normalizeAmount(value: number | string): number {
  const normalized = typeof value === "number" ? value : Number(value)

  if (!Number.isFinite(normalized)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "estimated_amount must be a valid number"
    )
  }

  return normalized
}

class CrmModuleService extends MedusaService({
  Lead,
  Opportunity,
}) {
  async createLead(data: CreateLeadInput) {
    if (data.status && !LEAD_STATUS_VALUES.includes(data.status)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid lead status: ${data.status}`
      )
    }

    return await this.createLeads(data)
  }

  async retrieveLeadById(id: string) {
    return await this.retrieveLead(id)
  }

  async listLeadRecords(filters: Record<string, unknown> = {}) {
    return await this.listLeads(filters)
  }

  async updateLead(data: UpdateLeadInput) {
    if (data.status && !LEAD_STATUS_VALUES.includes(data.status)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid lead status: ${data.status}`
      )
    }

    return await this.updateLeads(data)
  }

  async deleteLead(id: string) {
    await this.deleteLeads(id)
  }

  async createOpportunity(data: CreateOpportunityInput) {
    if (data.stage && !OPPORTUNITY_STAGE_VALUES.includes(data.stage)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid opportunity stage: ${data.stage}`
      )
    }

    return await this.createOpportunities({
      ...data,
      estimated_amount: normalizeAmount(data.estimated_amount),
    })
  }

  async retrieveOpportunityById(id: string) {
    return await this.retrieveOpportunity(id)
  }

  async listOpportunityRecords(filters: Record<string, unknown> = {}) {
    return await this.listOpportunities(filters)
  }

  async updateOpportunity(data: UpdateOpportunityInput) {
    if (data.stage && !OPPORTUNITY_STAGE_VALUES.includes(data.stage)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid opportunity stage: ${data.stage}`
      )
    }

    const normalizedAmount =
      data.estimated_amount === undefined
        ? undefined
        : normalizeAmount(data.estimated_amount)

    return await this.updateOpportunities({
      ...data,
      estimated_amount: normalizedAmount,
    })
  }

  async deleteOpportunity(id: string) {
    await this.deleteOpportunities(id)
  }

  async convertLeadToOpportunity(input: ConvertLeadInput) {
    const lead = await this.retrieveLead(input.lead_id)

    if (lead.status === "lost") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "A lost lead cannot be converted to opportunity"
      )
    }

    const opportunity = await this.createOpportunity({
      name: input.name,
      estimated_amount: input.estimated_amount,
      customer_id: input.customer_id,
      stage: input.stage ?? OpportunityStage.PROSPECTING,
      expected_close_date: input.expected_close_date,
      lead_id: input.lead_id,
    })

    const updatedLead = await this.updateLead({
      id: lead.id,
      status: LeadStatus.QUALIFIED,
      customer_id: input.customer_id,
    })

    return {
      lead: updatedLead,
      opportunity,
    }
  }
}

export default CrmModuleService
