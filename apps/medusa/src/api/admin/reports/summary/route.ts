import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { buildReportSummary, type ReportSummaryQuery } from "../lib/reporting"

function sendError(res: MedusaResponse, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error"
  res.status(500).json({ message })
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const report = await buildReportSummary(
      req.scope,
      (req.validatedQuery ?? {}) as ReportSummaryQuery
    )

    res.status(200).json(report)
  } catch (error) {
    sendError(res, error)
  }
}
