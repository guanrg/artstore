import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { CRM_MODULE } from "../../../../../modules/crm"
import type CrmModuleService from "../../../../../modules/crm/service"
import { TaskPriority, TaskStatus, TaskType } from "../../../../../modules/crm/models/task"

type UpdateTaskBody = {
  title?: string
  description?: string | null
  type?: TaskType
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: string | null
  completed_at?: string | null
  owner_id?: string | null
  customer_id?: string | null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function parseDateOrNull(value?: string | null): Date | null | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null || value === "") {
    return null
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

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    if (!isNonEmptyString(id)) {
      res.status(400).json({ message: "Task id is required in path params" })
      return
    }

    const crmService: CrmModuleService = req.scope.resolve(CRM_MODULE)
    const task = await crmService.retrieveTaskById(id)
    const relations = await crmService.listTaskRelationRecords({ task_id: id })

    res.status(200).json({ task, relations })
  } catch (error) {
    sendError(res, error)
  }
}

export async function PATCH(req: MedusaRequest<UpdateTaskBody>, res: MedusaResponse) {
  try {
    const { id } = req.params
    const body = (req.validatedBody ?? req.body ?? {}) as UpdateTaskBody

    if (!isNonEmptyString(id)) {
      res.status(400).json({ message: "Task id is required in path params" })
      return
    }

    const crmService: CrmModuleService = req.scope.resolve(CRM_MODULE)
    const customerService = req.scope.resolve(Modules.CUSTOMER)
    const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

    if (body.customer_id) {
      await customerService.retrieveCustomer(body.customer_id)
    }

    const task = await crmService.updateTask({
      id,
      title: body.title,
      description: body.description,
      type: body.type,
      status: body.status,
      priority: body.priority,
      due_date: parseDateOrNull(body.due_date),
      completed_at: parseDateOrNull(body.completed_at),
      owner_id: body.owner_id,
      customer_id: body.customer_id,
    })

    if (body.customer_id) {
      await createLinkIfNotExists(link, {
        [CRM_MODULE]: { task_id: id },
        [Modules.CUSTOMER]: { customer_id: body.customer_id },
      })
    }

    const relations = await crmService.listTaskRelationRecords({ task_id: id })
    res.status(200).json({ task, relations })
  } catch (error) {
    sendError(res, error)
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    if (!isNonEmptyString(id)) {
      res.status(400).json({ message: "Task id is required in path params" })
      return
    }

    const crmService: CrmModuleService = req.scope.resolve(CRM_MODULE)
    await crmService.deleteTask(id)

    res.status(200).json({ id, object: "task", deleted: true })
  } catch (error) {
    sendError(res, error)
  }
}
