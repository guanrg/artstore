import {
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import {
  AdminConvertLeadBody,
  AdminCreateLeadBody,
  AdminUpdateOpportunityBody,
} from "./admin/crm/validators"

export default defineMiddlewares({
  routes: [
    {
      methods: ["POST"],
      matcher: "/admin/crm/leads",
      middlewares: [validateAndTransformBody(AdminCreateLeadBody)],
    },
    {
      methods: ["POST"],
      matcher: "/admin/crm/leads/:id/convert",
      middlewares: [validateAndTransformBody(AdminConvertLeadBody)],
    },
    {
      methods: ["PATCH"],
      matcher: "/admin/crm/opportunities/:id",
      middlewares: [validateAndTransformBody(AdminUpdateOpportunityBody)],
    },
  ],
})

