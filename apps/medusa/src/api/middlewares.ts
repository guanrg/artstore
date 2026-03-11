import {
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import {
  AdminListLeadsQuery,
  AdminListOpportunitiesQuery,
  AdminListTasksQuery,
  AdminAddTaskRelationsBody,
  AdminConvertLeadBody,
  AdminCreateLeadBody,
  AdminCreateOpportunityBody,
  AdminCreateTaskBody,
  AdminDeleteTaskRelationsBody,
  AdminUpdateLeadBody,
  AdminUpdateOpportunityBody,
  AdminUpdateTaskBody,
} from "./admin/crm/validators"

export default defineMiddlewares({
  routes: [
    {
      methods: ["POST"],
      matcher: "/admin/crm/leads",
      middlewares: [validateAndTransformBody(AdminCreateLeadBody)],
    },
    {
      methods: ["GET"],
      matcher: "/admin/crm/leads",
      middlewares: [validateAndTransformQuery(AdminListLeadsQuery, { isList: true })],
    },
    {
      methods: ["POST"],
      matcher: "/admin/crm/leads/:id/convert",
      middlewares: [validateAndTransformBody(AdminConvertLeadBody)],
    },
    {
      methods: ["PATCH"],
      matcher: "/admin/crm/leads/:id",
      middlewares: [validateAndTransformBody(AdminUpdateLeadBody)],
    },
    {
      methods: ["GET"],
      matcher: "/admin/crm/opportunities",
      middlewares: [
        validateAndTransformQuery(AdminListOpportunitiesQuery, {
          isList: true,
        }),
      ],
    },
    {
      methods: ["PATCH"],
      matcher: "/admin/crm/opportunities/:id",
      middlewares: [validateAndTransformBody(AdminUpdateOpportunityBody)],
    },
    {
      methods: ["POST"],
      matcher: "/admin/crm/opportunities",
      middlewares: [validateAndTransformBody(AdminCreateOpportunityBody)],
    },
    {
      methods: ["GET"],
      matcher: "/admin/crm/tasks",
      middlewares: [validateAndTransformQuery(AdminListTasksQuery, { isList: true })],
    },
    {
      methods: ["POST"],
      matcher: "/admin/crm/tasks",
      middlewares: [validateAndTransformBody(AdminCreateTaskBody)],
    },
    {
      methods: ["PATCH"],
      matcher: "/admin/crm/tasks/:id",
      middlewares: [validateAndTransformBody(AdminUpdateTaskBody)],
    },
    {
      methods: ["POST"],
      matcher: "/admin/crm/tasks/:id/relations",
      middlewares: [validateAndTransformBody(AdminAddTaskRelationsBody)],
    },
    {
      methods: ["DELETE"],
      matcher: "/admin/crm/tasks/:id/relations",
      middlewares: [validateAndTransformBody(AdminDeleteTaskRelationsBody)],
    },
  ],
})
