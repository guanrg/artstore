import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  buildOrderRows,
  createDateRange,
  listOrderRecords,
  type ReportOrderStatusFilter,
  type ReportSummaryQuery,
} from "../lib/reporting"

type ReportOrdersQuery = ReportSummaryQuery & {
  status?: ReportOrderStatusFilter
}

function sendError(res: MedusaResponse, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error"
  res.status(500).json({ message })
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const query = (req.validatedQuery ?? {}) as ReportOrdersQuery
    const orders = await listOrderRecords(req.scope, query)
    const rows = buildOrderRows(orders, query.status || "")
    const range = createDateRange(query)

    res.status(200).json({
      range: {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
        days: range.days,
      },
      status: query.status || "",
      orders: rows,
    })
  } catch (error) {
    sendError(res, error)
  }
}
