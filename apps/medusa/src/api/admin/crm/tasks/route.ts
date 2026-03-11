import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { CRM_MODULE } from "../../../../modules/crm"
import type CrmModuleService from "../../../../modules/crm/service"
import { TaskPriority, TaskStatus, TaskType } from "../../../../modules/crm/models/task"

type CreateTaskBody = {
  title?: string
  description?: string
  type?: TaskType
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: string
  completed_at?: string
  owner_id?: string
  customer_id?: string
  relations?: Array<{
    target_type: string
    target_id: string
    relationship?: string
  }>
}

type ListTaskQuery = {
  target_type?: string
  target_id?: string
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function parseDateOrUndefined(value?: string): Date | undefined {
  if (value === undefined) {
    return undefined
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Date field must be a valid date string"
    )
  }
  return parsed
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

export async function GET(req: MedusaRequest<ListTaskQuery>, res: MedusaResponse) {
  try {
    const crmService: CrmModuleService = req.scope.resolve(CRM_MODULE)
    const targetType = (req.validatedQuery as any)?.target_type
    const targetId = (req.validatedQuery as any)?.target_id

    if ((targetType && !targetId) || (!targetType && targetId)) {
      res.status(400).json({
        message: "target_type and target_id must be provided together",
      })
      return
    }

    if (isNonEmptyString(targetType) && isNonEmptyString(targetId)) {
      const [tasks, count] = await crmService.listAndCountTaskRecordsByTarget(
        targetType,
        targetId,
        req.listConfig ?? {}
      )

      res.status(200).json({
        tasks,
        count,
        limit: req.validatedQuery?.limit ?? null,
        offset: req.validatedQuery?.offset ?? null,
      })
      return
    }

    const [tasks, count] = await crmService.listAndCountTaskRecords(
      req.filterableFields ?? {},
      req.listConfig ?? {}
    )

    res.status(200).json({
      tasks,
      count,
      limit: req.validatedQuery?.limit ?? null,
      offset: req.validatedQuery?.offset ?? null,
    })
  } catch (error) {
    sendError(res, error)
  }
}

export async function POST(req: MedusaRequest<CreateTaskBody>, res: MedusaResponse) {
  try {
    const body = (req.validatedBody ?? req.body ?? {}) as CreateTaskBody
    if (!isNonEmptyString(body.title)) {
      res.status(400).json({ message: "title is required" })
      return
    }

    const crmService: CrmModuleService = req.scope.resolve(CRM_MODULE)
    const customerService = req.scope.resolve(Modules.CUSTOMER)
    const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

    if (body.customer_id) {
      await customerService.retrieveCustomer(body.customer_id)
    }

    if (body.relations?.length) {
      for (const relation of body.relations) {
        await validateKnownTarget(
          crmService,
          customerService,
          relation.target_type,
          relation.target_id
        )
      }
    }

    const task = await crmService.createTask({
      title: body.title,
      description: body.description,
      type: body.type,
      status: body.status,
      priority: body.priority,
      due_date: parseDateOrUndefined(body.due_date),
      completed_at: parseDateOrUndefined(body.completed_at),
      owner_id: body.owner_id,
      customer_id: body.customer_id,
    })

    if (body.relations?.length) {
      await crmService.addTaskRelations(
        task.id,
        body.relations.map((relation) => ({
          task_id: task.id,
          target_type: relation.target_type,
          target_id: relation.target_id,
          relationship: relation.relationship,
        }))
      )
    }

    const customerIds = new Set<string>()
    if (body.customer_id) {
      customerIds.add(body.customer_id)
    }
    for (const relation of body.relations ?? []) {
      if (relation.target_type.trim().toLowerCase() === "customer") {
        customerIds.add(relation.target_id)
      }
    }

    for (const customerId of customerIds) {
      await createLinkIfNotExists(link, {
        [CRM_MODULE]: { task_id: task.id },
        [Modules.CUSTOMER]: { customer_id: customerId },
      })
    }

    const relations = await crmService.listTaskRelationRecords({ task_id: task.id })
    res.status(201).json({ task, relations })
  } catch (error) {
    sendError(res, error)
  }
}
