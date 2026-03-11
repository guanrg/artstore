import { z } from "@medusajs/framework/zod"
import { LeadStatus } from "../../../modules/crm/models/lead"
import { OpportunityStage } from "../../../modules/crm/models/opportunity"
import { TaskPriority, TaskStatus, TaskType } from "../../../modules/crm/models/task"

const amountSchema = z.union([z.number(), z.string().trim().min(1)])
const numberInQuery = z.preprocess((value) => {
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : value
  }
  return value
}, z.number().int().min(0))

export const AdminCreateLeadBody = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  company: z.string().trim().min(1),
  source: z.string().trim().min(1),
  status: z.nativeEnum(LeadStatus).optional(),
  customer_id: z.string().trim().min(1).optional(),
})

export const AdminConvertLeadBody = z.object({
  name: z.string().trim().min(1),
  estimated_amount: amountSchema,
  customer_id: z.string().trim().min(1).optional(),
  stage: z.nativeEnum(OpportunityStage).optional(),
  expected_close_date: z.string().trim().optional(),
})

export const AdminUpdateLeadBody = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    company: z.string().trim().min(1).optional(),
    source: z.string().trim().min(1).optional(),
    status: z.nativeEnum(LeadStatus).optional(),
    customer_id: z.string().trim().min(1).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one updatable field is required",
  })

export const AdminCreateOpportunityBody = z.object({
  name: z.string().trim().min(1),
  estimated_amount: amountSchema,
  customer_id: z.string().trim().min(1),
  stage: z.nativeEnum(OpportunityStage).optional(),
  expected_close_date: z.string().trim().optional(),
  lead_id: z.string().trim().min(1).optional(),
})

export const AdminUpdateOpportunityBody = z
  .object({
    name: z.string().trim().min(1).optional(),
    estimated_amount: amountSchema.optional(),
    customer_id: z.string().trim().min(1).optional(),
    stage: z.nativeEnum(OpportunityStage).optional(),
    expected_close_date: z.string().trim().nullable().optional(),
    lead_id: z.string().trim().min(1).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one updatable field is required",
  })

export const AdminListLeadsQuery = z.object({
  customer_id: z.string().trim().optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  limit: numberInQuery.optional(),
  offset: numberInQuery.optional(),
  order: z.string().trim().optional(),
})

export const AdminListOpportunitiesQuery = z.object({
  customer_id: z.string().trim().optional(),
  lead_id: z.string().trim().optional(),
  stage: z.nativeEnum(OpportunityStage).optional(),
  limit: numberInQuery.optional(),
  offset: numberInQuery.optional(),
  order: z.string().trim().optional(),
})

const taskRelationSchema = z.object({
  target_type: z.string().trim().min(1),
  target_id: z.string().trim().min(1),
  relationship: z.string().trim().min(1).optional(),
})

export const AdminCreateTaskBody = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  type: z.nativeEnum(TaskType).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  due_date: z.string().trim().optional(),
  completed_at: z.string().trim().optional(),
  owner_id: z.string().trim().optional(),
  customer_id: z.string().trim().optional(),
  relations: z.array(taskRelationSchema).optional(),
})

export const AdminUpdateTaskBody = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    type: z.nativeEnum(TaskType).optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    due_date: z.string().trim().nullable().optional(),
    completed_at: z.string().trim().nullable().optional(),
    owner_id: z.string().trim().nullable().optional(),
    customer_id: z.string().trim().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one updatable field is required",
  })

export const AdminListTasksQuery = z.object({
  title: z.string().trim().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  type: z.nativeEnum(TaskType).optional(),
  owner_id: z.string().trim().optional(),
  customer_id: z.string().trim().optional(),
  target_type: z.string().trim().optional(),
  target_id: z.string().trim().optional(),
  limit: numberInQuery.optional(),
  offset: numberInQuery.optional(),
  order: z.string().trim().optional(),
})

export const AdminAddTaskRelationsBody = z.object({
  relations: z.array(taskRelationSchema).min(1),
})

export const AdminDeleteTaskRelationsBody = z
  .object({
    relation_ids: z.array(z.string().trim().min(1)).optional(),
    targets: z
      .array(
        z.object({
          target_type: z.string().trim().min(1),
          target_id: z.string().trim().min(1),
        })
      )
      .optional(),
  })
  .refine((value) => {
    return Boolean(value.relation_ids?.length || value.targets?.length)
  }, {
    message: "Provide relation_ids or targets",
  })
