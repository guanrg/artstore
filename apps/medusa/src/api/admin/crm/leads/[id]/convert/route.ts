import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { CRM_MODULE } from "../../../../../../modules/crm"
import { OpportunityStage } from "../../../../../../modules/crm/models/opportunity"
import type CrmModuleService from "../../../../../../modules/crm/service"

type ConvertLeadBody = {
  name?: string
  estimated_amount?: number | string
  customer_id?: string
  stage?: OpportunityStage
  expected_close_date?: string
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function sendError(res: MedusaResponse, error: unknown) {
  if (MedusaError.isMedusaError(error)) {
    const status =
      error.type === MedusaError.Types.INVALID_DATA ||
      error.type === MedusaError.Types.INVALID_ARGUMENT
        ? 400
        : error.type === MedusaError.Types.NOT_FOUND
          ? 404
          : 500

    res.status(status).json({ message: error.message, type: error.type })
    return
  }

  const message = error instanceof Error ? error.message : "Unknown error"
  res.status(500).json({ message })
}

async function createLinkIfNotExists(
  link: any,
  data: any
) {
  try {
    await link.create(data)
  } catch (error) {
    if (
      MedusaError.isMedusaError(error) &&
      error.type === MedusaError.Types.DUPLICATE_ERROR
    ) {
      return
    }
    throw error
  }
}

function parseDateOrNull(value?: string): Date | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "expected_close_date must be a valid date string"
    )
  }

  return parsed
}

export async function POST(req: MedusaRequest<ConvertLeadBody>, res: MedusaResponse) {
  try {
    const { id } = req.params
    const body = (req.validatedBody ?? req.body ?? {}) as ConvertLeadBody

    if (!isNonEmptyString(id)) {
      res.status(400).json({ message: "Lead id is required in path params" })
      return
    }

    if (!isNonEmptyString(body.name)) {
      res.status(400).json({ message: "Opportunity name is required" })
      return
    }

    if (body.estimated_amount === undefined || body.estimated_amount === null) {
      res.status(400).json({ message: "estimated_amount is required" })
      return
    }

    const crmService: CrmModuleService = req.scope.resolve(CRM_MODULE)
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
    const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

    const lead = await crmService.retrieveLeadById(id)
    const customerId = body.customer_id ?? lead.customer_id

    if (!isNonEmptyString(customerId)) {
      res.status(400).json({
        message: "customer_id is required (or lead must already be linked to a customer)",
      })
      return
    }

    await customerModuleService.retrieveCustomer(customerId)

    const result = await crmService.convertLeadToOpportunity({
      lead_id: id,
      name: body.name,
      estimated_amount: body.estimated_amount,
      customer_id: customerId,
      stage: body.stage,
      expected_close_date: parseDateOrNull(body.expected_close_date),
    })

    await createLinkIfNotExists(link, {
      [CRM_MODULE]: { opportunity_id: result.opportunity.id },
      [Modules.CUSTOMER]: { customer_id: customerId },
    })

    await createLinkIfNotExists(link, {
      [CRM_MODULE]: { lead_id: id },
      [Modules.CUSTOMER]: { customer_id: customerId },
    })

    res.status(201).json(result)
  } catch (error) {
    sendError(res, error)
  }
}
