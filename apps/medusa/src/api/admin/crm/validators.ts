import { z } from "@medusajs/framework/zod"
import { LeadStatus } from "../../../modules/crm/models/lead"
import { OpportunityStage } from "../../../modules/crm/models/opportunity"

const amountSchema = z.union([z.number(), z.string().trim().min(1)])

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

