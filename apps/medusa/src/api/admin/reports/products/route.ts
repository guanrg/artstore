import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  buildProductRows,
  createDateRange,
  listOrderRecords,
  type ReportSummaryQuery,
} from "../lib/reporting"

function sendError(res: MedusaResponse, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error"
  res.status(500).json({ message })
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const query = (req.validatedQuery ?? {}) as ReportSummaryQuery
    const orders = await listOrderRecords(req.scope, query)
    const products = buildProductRows(orders)
    const range = createDateRange(query)

    res.status(200).json({
      range: {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
        days: range.days,
      },
      products,
    })
  } catch (error) {
    sendError(res, error)
  }
}
