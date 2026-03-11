import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { CRM_MODULE } from "../../../../../modules/crm"
import type CrmModuleService from "../../../../../modules/crm/service"
import { OpportunityStage } from "../../../../../modules/crm/models/opportunity"

type UpdateOpportunityBody = {
  name?: string
  estimated_amount?: number | string
  customer_id?: string
  stage?: OpportunityStage
  expected_close_date?: string | null
  lead_id?: string | null
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

function parseDateOrNull(value?: string | null): Date | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null || !value) {
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

async function createLinkIfNotExists(link: any, data: any) {
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

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    if (!isNonEmptyString(id)) {
      res.status(400).json({ message: "Opportunity id is required in path params" })
      return
    }

    const crmService: CrmModuleService = req.scope.resolve(CRM_MODULE)
    const opportunity = await crmService.retrieveOpportunityById(id)

    res.status(200).json({ opportunity })
  } catch (error) {
    sendError(res, error)
  }
}

export async function PATCH(
  req: MedusaRequest<UpdateOpportunityBody>,
  res: MedusaResponse
) {
  try {
    const { id } = req.params
    const body = (req.validatedBody ?? req.body ?? {}) as UpdateOpportunityBody

    if (!isNonEmptyString(id)) {
      res.status(400).json({ message: "Opportunity id is required in path params" })
      return
    }

    const crmService: CrmModuleService = req.scope.resolve(CRM_MODULE)
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
    const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

    if (body.customer_id) {
      await customerModuleService.retrieveCustomer(body.customer_id)
    }

    const opportunity = await crmService.updateOpportunity({
      id,
      name: body.name,
      estimated_amount: body.estimated_amount,
      customer_id: body.customer_id,
      stage: body.stage,
      expected_close_date: parseDateOrNull(body.expected_close_date),
      lead_id: body.lead_id,
    })

    if (body.customer_id) {
      await createLinkIfNotExists(link, {
        [CRM_MODULE]: { opportunity_id: id },
        [Modules.CUSTOMER]: { customer_id: body.customer_id },
      })
    }

    res.status(200).json({ opportunity })
  } catch (error) {
    sendError(res, error)
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    if (!isNonEmptyString(id)) {
      res.status(400).json({ message: "Opportunity id is required in path params" })
      return
    }

    const crmService: CrmModuleService = req.scope.resolve(CRM_MODULE)
    await crmService.deleteOpportunity(id)

    res.status(200).json({ id, object: "opportunity", deleted: true })
  } catch (error) {
    sendError(res, error)
  }
}
