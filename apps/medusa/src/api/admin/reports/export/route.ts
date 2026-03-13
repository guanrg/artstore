import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  buildReportCsv,
  buildReportSummary,
  createDateRange,
  type ReportSummaryQuery,
} from "../lib/reporting"

function sendError(res: MedusaResponse, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error"
  res.status(500).json({ message })
}

function buildFilename(query: ReportSummaryQuery) {
  const { start, end } = createDateRange(query)
  const startKey = start.toISOString().slice(0, 10)
  const endKey = end.toISOString().slice(0, 10)
  return `report-${startKey}-to-${endKey}.csv`
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const query = (req.validatedQuery ?? {}) as ReportSummaryQuery
    const report = await buildReportSummary(req.scope, query)
    const csv = buildReportCsv(report)

    res.setHeader("content-type", "text/csv; charset=utf-8")
    res.setHeader("content-disposition", `attachment; filename="${buildFilename(query)}"`)
    res.status(200).send(csv)
  } catch (error) {
    sendError(res, error)
  }
}
