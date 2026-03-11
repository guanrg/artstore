import { MedusaError } from "@medusajs/framework/utils"
import { MedusaService } from "@medusajs/framework/utils"
import Lead, { LeadStatus } from "./models/lead"
import Opportunity, { OpportunityStage } from "./models/opportunity"
import Task, {
  TaskPriority,
  TaskStatus,
  TaskType,
} from "./models/task"
import TaskRelation from "./models/task-relation"

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

type CreateTaskInput = {
  title: string
  description?: string | null
  type?: TaskType
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: Date | null
  completed_at?: Date | null
  owner_id?: string | null
  customer_id?: string | null
}

type UpdateTaskInput = Partial<CreateTaskInput> & {
  id: string
}

type CreateTaskRelationInput = {
  task_id: string
  target_type: string
  target_id: string
  relationship?: string
}

const LEAD_STATUS_VALUES = Object.values(LeadStatus)
const OPPORTUNITY_STAGE_VALUES = Object.values(OpportunityStage)
const TASK_TYPE_VALUES = Object.values(TaskType)
const TASK_STATUS_VALUES = Object.values(TaskStatus)
const TASK_PRIORITY_VALUES = Object.values(TaskPriority)

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
  Task,
  TaskRelation,
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

  async listAndCountLeadRecords(
    filters: Record<string, unknown> = {},
    config: any = {}
  ) {
    return await this.listAndCountLeads(filters, config)
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

  async listAndCountOpportunityRecords(
    filters: Record<string, unknown> = {},
    config: any = {}
  ) {
    return await this.listAndCountOpportunities(filters, config)
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

    const [existingOpportunities, existingCount] =
      await this.listAndCountOpportunities({
        lead_id: input.lead_id,
      })

    if (existingCount > 0) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        `Lead ${input.lead_id} has already been converted to opportunity ${existingOpportunities[0].id}`
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

  async createTask(data: CreateTaskInput) {
    if (data.type && !TASK_TYPE_VALUES.includes(data.type)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid task type: ${data.type}`
      )
    }

    if (data.status && !TASK_STATUS_VALUES.includes(data.status)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid task status: ${data.status}`
      )
    }

    if (data.priority && !TASK_PRIORITY_VALUES.includes(data.priority)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid task priority: ${data.priority}`
      )
    }

    return await this.createTasks(data)
  }

  async retrieveTaskById(id: string) {
    return await this.retrieveTask(id)
  }

  async listAndCountTaskRecords(
    filters: Record<string, unknown> = {},
    config: any = {}
  ) {
    return await this.listAndCountTasks(filters, config)
  }

  async updateTask(data: UpdateTaskInput) {
    if (data.type && !TASK_TYPE_VALUES.includes(data.type)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid task type: ${data.type}`
      )
    }

    if (data.status && !TASK_STATUS_VALUES.includes(data.status)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid task status: ${data.status}`
      )
    }

    if (data.priority && !TASK_PRIORITY_VALUES.includes(data.priority)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid task priority: ${data.priority}`
      )
    }

    return await this.updateTasks(data)
  }

  async deleteTask(id: string) {
    const relations = await this.listTaskRelationRecords({ task_id: id })
    if (relations.length) {
      await this.deleteTaskRelations(relations.map((relation) => relation.id))
    }
    await this.deleteTasks(id)
  }

  async listTaskRelationRecords(filters: Record<string, unknown> = {}) {
    return await this.listTaskRelations(filters)
  }

  async addTaskRelations(taskId: string, relations: CreateTaskRelationInput[]) {
    await this.retrieveTaskById(taskId)

    const toCreate: CreateTaskRelationInput[] = []

    for (const relation of relations) {
      const targetType = relation.target_type.trim().toLowerCase()
      const targetId = relation.target_id.trim()
      if (!targetType || !targetId) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "target_type and target_id are required"
        )
      }

      const [, count] = await this.listAndCountTaskRelations({
        task_id: taskId,
        target_type: targetType,
        target_id: targetId,
      })

      if (count > 0) {
        continue
      }

      toCreate.push({
        task_id: taskId,
        target_type: targetType,
        target_id: targetId,
        relationship: relation.relationship?.trim() || "related",
      })
    }

    if (!toCreate.length) {
      return []
    }

    return await this.createTaskRelations(toCreate)
  }

  async deleteTaskRelationsByIds(ids: string[]) {
    if (!ids.length) {
      return
    }

    await this.deleteTaskRelations(ids)
  }

  async deleteTaskRelationsByTargets(
    taskId: string,
    targets: Array<{ target_type: string; target_id: string }>
  ) {
    for (const target of targets) {
      const relations = await this.listTaskRelationRecords({
        task_id: taskId,
        target_type: target.target_type.trim().toLowerCase(),
        target_id: target.target_id.trim(),
      })

      if (relations.length) {
        await this.deleteTaskRelations(relations.map((relation) => relation.id))
      }
    }
  }

  async listAndCountTaskRecordsByTarget(
    targetType: string,
    targetId: string,
    config: any = {}
  ) {
    const relations = await this.listTaskRelationRecords({
      target_type: targetType.trim().toLowerCase(),
      target_id: targetId.trim(),
    })

    if (!relations.length) {
      return [[], 0] as const
    }

    const taskIds = Array.from(new Set(relations.map((relation) => relation.task_id)))
    return await this.listAndCountTasks(
      {
        id: taskIds,
      },
      config
    )
  }
}

export default CrmModuleService
