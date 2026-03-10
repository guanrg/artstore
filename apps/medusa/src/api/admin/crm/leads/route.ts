import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { CRM_MODULE } from "../../../../modules/crm"
import { LeadStatus } from "../../../../modules/crm/models/lead"
import type CrmModuleService from "../../../../modules/crm/service"

type CreateLeadBody = {
  name?: string
  email?: string
  company?: string
  source?: string
  status?: LeadStatus
  customer_id?: string
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

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const crmService: CrmModuleService = req.scope.resolve(CRM_MODULE)
  const leads = await crmService.listLeadRecords()

  res.status(200).json({ leads })
}

export async function POST(req: MedusaRequest<CreateLeadBody>, res: MedusaResponse) {
  try {
    const body = req.body ?? {}

    if (
      !isNonEmptyString(body.name) ||
      !isNonEmptyString(body.email) ||
      !isNonEmptyString(body.company) ||
      !isNonEmptyString(body.source)
    ) {
      res.status(400).json({
        message: "name, email, company, and source are required",
      })
      return
    }

    const crmService: CrmModuleService = req.scope.resolve(CRM_MODULE)
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
    const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

    if (body.customer_id) {
      await customerModuleService.retrieveCustomer(body.customer_id)
    }

    const lead = await crmService.createLead({
      name: body.name,
      email: body.email,
      company: body.company,
      source: body.source,
      status: body.status,
      customer_id: body.customer_id ?? null,
    })

    if (body.customer_id) {
      await createLinkIfNotExists(link, {
        [CRM_MODULE]: { lead_id: lead.id },
        [Modules.CUSTOMER]: { customer_id: body.customer_id },
      })
    }

    res.status(201).json({ lead })
  } catch (error) {
    sendError(res, error)
  }
}
