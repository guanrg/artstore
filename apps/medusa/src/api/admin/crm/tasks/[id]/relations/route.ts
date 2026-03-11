import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { CRM_MODULE } from "../../../../../../modules/crm"
import type CrmModuleService from "../../../../../../modules/crm/service"

type AddTaskRelationsBody = {
  relations?: Array<{
    target_type: string
    target_id: string
    relationship?: string
  }>
}

type DeleteTaskRelationsBody = {
  relation_ids?: string[]
  targets?: Array<{
    target_type: string
    target_id: string
  }>
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
          : error.type === MedusaError.Types.CONFLICT
            ? 409
            : 500

    res.status(status).json({ message: error.message, type: error.type })
    return
  }

  const message = error instanceof Error ? error.message : "Unknown error"
  res.status(500).json({ message })
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

async function validateKnownTarget(
  crmService: CrmModuleService,
  customerService: any,
  targetType: string,
  targetId: string
) {
  const normalized = targetType.trim().toLowerCase()
  if (normalized === "lead") {
    await crmService.retrieveLeadById(targetId)
    return
  }
  if (normalized === "opportunity") {
    await crmService.retrieveOpportunityById(targetId)
    return
  }
  if (normalized === "customer") {
    await customerService.retrieveCustomer(targetId)
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    if (!isNonEmptyString(id)) {
      res.status(400).json({ message: "Task id is required in path params" })
      return
    }

    const crmService: CrmModuleService = req.scope.resolve(CRM_MODULE)
    await crmService.retrieveTaskById(id)

    const relations = await crmService.listTaskRelationRecords({ task_id: id })
    res.status(200).json({ relations, count: relations.length })
  } catch (error) {
    sendError(res, error)
  }
}

export async function POST(
  req: MedusaRequest<AddTaskRelationsBody>,
  res: MedusaResponse
) {
  try {
    const { id } = req.params
    const body = (req.validatedBody ?? req.body ?? {}) as AddTaskRelationsBody
    if (!isNonEmptyString(id)) {
      res.status(400).json({ message: "Task id is required in path params" })
      return
    }

    const crmService: CrmModuleService = req.scope.resolve(CRM_MODULE)
    const customerService = req.scope.resolve(Modules.CUSTOMER)
    const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

    for (const relation of body.relations ?? []) {
      await validateKnownTarget(
        crmService,
        customerService,
        relation.target_type,
        relation.target_id
      )
    }

    const created = await crmService.addTaskRelations(
      id,
      (body.relations ?? []).map((relation) => ({
        task_id: id,
        target_type: relation.target_type,
        target_id: relation.target_id,
        relationship: relation.relationship,
      }))
    )

    for (const relation of body.relations ?? []) {
      if (relation.target_type.trim().toLowerCase() === "customer") {
        await createLinkIfNotExists(link, {
          [CRM_MODULE]: { task_id: id },
          [Modules.CUSTOMER]: { customer_id: relation.target_id },
        })
      }
    }

    const relations = await crmService.listTaskRelationRecords({ task_id: id })
    res.status(201).json({ created, relations })
  } catch (error) {
    sendError(res, error)
  }
}

export async function DELETE(
  req: MedusaRequest<DeleteTaskRelationsBody>,
  res: MedusaResponse
) {
  try {
    const { id } = req.params
    const body = (req.validatedBody ?? req.body ?? {}) as DeleteTaskRelationsBody
    if (!isNonEmptyString(id)) {
      res.status(400).json({ message: "Task id is required in path params" })
      return
    }

    const crmService: CrmModuleService = req.scope.resolve(CRM_MODULE)
    await crmService.retrieveTaskById(id)

    if (body.relation_ids?.length) {
      await crmService.deleteTaskRelationsByIds(body.relation_ids)
    }
    if (body.targets?.length) {
      await crmService.deleteTaskRelationsByTargets(id, body.targets)
    }

    const relations = await crmService.listTaskRelationRecords({ task_id: id })
    res.status(200).json({ relations, count: relations.length })
  } catch (error) {
    sendError(res, error)
  }
}

