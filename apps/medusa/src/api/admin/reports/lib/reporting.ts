import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CRM_MODULE } from "../../../../modules/crm"
import type CrmModuleService from "../../../../modules/crm/service"

export type ReportSummaryQuery = {
  days?: number
  start?: Date
  end?: Date
}

export type ReportOrderStatusFilter = "" | "active" | "canceled" | "refunded"

type OrderItem = {
  id?: string
  title?: string
  product_title?: string
  quantity?: number | string
  total?: number | string
  subtotal?: number | string
}

type OrderRecord = {
  id: string
  created_at?: string
  total?: number | string
  status?: string
  currency_code?: string
  customer_id?: string | null
  canceled_at?: string | null
  summary?: {
    refunded_total?: number | string
  } | null
  items?: OrderItem[]
}

export type ReportOrderRow = {
  id: string
  created_at: string
  status: string
  customer_id: string | null
  currency_code: string
  total: number
  refunded_total: number
  is_canceled: boolean
  refund_state: "none" | "partial" | "full"
  item_count: number
}

export type ReportProductRow = {
  title: string
  quantity: number
  sales: number
  orders: number
}

type CustomerRecord = {
  id: string
  created_at?: string
}

type LeadRecord = {
  status?: "new" | "contacted" | "qualified" | "lost"
}

type OpportunityRecord = {
  stage?: "prospecting" | "negotiation" | "closed_won" | "closed_lost"
  estimated_amount?: number | string
}

type TaskRecord = {
  status?: "open" | "in_progress" | "completed" | "canceled"
  due_date?: string | null
}

type ScopeLike = {
  resolve: (token: string) => any
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function formatDayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function formatCurrency(code: string | undefined, amount: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: (code || "aud").toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount)
}

function buildTrendBuckets(start: Date, end: Date) {
  const buckets = new Map<string, { date: string; sales: number; orders: number }>()
  const cursor = new Date(start)

  while (cursor <= end) {
    const key = formatDayKey(cursor)
    buckets.set(key, { date: key, sales: 0, orders: 0 })
    cursor.setDate(cursor.getDate() + 1)
  }

  return buckets
}

export function createDateRange(query: ReportSummaryQuery) {
  const end = endOfDay(query.end ?? new Date())
  const start = startOfDay(
    query.start ??
      new Date(end.getTime() - ((query.days ?? 30) - 1) * 24 * 60 * 60 * 1000)
  )
  const diffDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime() + 1) / (24 * 60 * 60 * 1000))
  )

  return { start, end, days: diffDays }
}

async function fetchAllGraph<T>(scope: ScopeLike, config: {
  entity: string
  fields: string[]
  filters?: Record<string, unknown>
  take?: number
}) {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const take = config.take ?? 250
  const rows: T[] = []
  let skip = 0

  while (true) {
    const result = await query.graph({
      entity: config.entity,
      fields: config.fields,
      filters: config.filters,
      pagination: {
        take,
        skip,
      },
    })

    const batch = (result?.data ?? []) as T[]
    rows.push(...batch)

    if (batch.length < take) {
      break
    }

    skip += take
  }

  return rows
}

async function fetchAllCrm<T>(
  listAndCount: (filters?: Record<string, unknown>, config?: Record<string, unknown>) => Promise<[T[], number]>,
  filters: Record<string, unknown> = {},
  take = 250
) {
  const rows: T[] = []
  let skip = 0

  while (true) {
    const [batch, total] = await listAndCount(filters, { take, skip })
    rows.push(...batch)

    skip += batch.length
    if (!batch.length || rows.length >= total) {
      break
    }
  }

  return rows
}

export async function buildReportSummary(scope: ScopeLike, rawQuery: ReportSummaryQuery) {
  const crmService: CrmModuleService = scope.resolve(CRM_MODULE)
  const { start, end, days } = createDateRange(rawQuery)

  const [orders, customers, leads, opportunities, tasks] = await Promise.all([
    listOrderRecords(scope, rawQuery),
    fetchAllGraph<CustomerRecord>(scope, {
      entity: "customer",
      fields: ["id", "created_at"],
      filters: {
        created_at: {
          $gte: start.toISOString(),
          $lte: end.toISOString(),
        },
      },
    }).catch(() => []),
    fetchAllCrm<LeadRecord>(crmService.listAndCountLeadRecords.bind(crmService)),
    fetchAllCrm<OpportunityRecord>(crmService.listAndCountOpportunityRecords.bind(crmService)),
    fetchAllCrm<TaskRecord>(crmService.listAndCountTaskRecords.bind(crmService)),
  ])

  const trendBuckets = buildTrendBuckets(start, end)
  const productMap = new Map<string, { title: string; quantity: number; sales: number; orders: number }>()
  const customerIds = new Set<string>()
  let totalSales = 0
  let refundedTotal = 0
  let refundedOrders = 0
  let fullRefundOrders = 0
  let partialRefundOrders = 0
  let canceledOrders = 0
  let canceledSales = 0

  for (const order of orders) {
    const orderTotal = toNumber(order.total)
    const refundedAmount = toNumber(order.summary?.refunded_total)
    const isCanceled = order.status === "canceled" || Boolean(order.canceled_at)

    if (!isCanceled) {
      totalSales += orderTotal
    }

    if (!isCanceled && order.customer_id) {
      customerIds.add(order.customer_id)
    }

    if (!isCanceled && order.created_at) {
      const bucket = trendBuckets.get(formatDayKey(new Date(order.created_at)))
      if (bucket) {
        bucket.sales += orderTotal
        bucket.orders += 1
      }
    }

    for (const item of isCanceled ? [] : order.items ?? []) {
      const title = item.product_title || item.title || "Untitled product"
      const current = productMap.get(title) ?? { title, quantity: 0, sales: 0, orders: 0 }

      current.quantity += toNumber(item.quantity)
      current.sales += toNumber(item.total) || toNumber(item.subtotal)
      current.orders += 1
      productMap.set(title, current)
    }

    canceledOrders += isCanceled ? 1 : 0
    canceledSales += isCanceled ? orderTotal : 0
    refundedTotal += refundedAmount
    refundedOrders += refundedAmount > 0 ? 1 : 0
    fullRefundOrders += refundedAmount > 0 && refundedAmount >= orderTotal ? 1 : 0
    partialRefundOrders += refundedAmount > 0 && refundedAmount < orderTotal ? 1 : 0
  }

  const leadStatus = {
    new: 0,
    contacted: 0,
    qualified: 0,
    lost: 0,
  }
  const opportunityStage = {
    prospecting: 0,
    negotiation: 0,
    closed_won: 0,
    closed_lost: 0,
  }
  const taskStatus = {
    open: 0,
    in_progress: 0,
    completed: 0,
    canceled: 0,
    overdue: 0,
  }

  for (const lead of leads) {
    if (lead.status && lead.status in leadStatus) {
      leadStatus[lead.status] += 1
    }
  }

  let pipelineAmount = 0
  let wonAmount = 0

  for (const opportunity of opportunities) {
    if (opportunity.stage && opportunity.stage in opportunityStage) {
      opportunityStage[opportunity.stage] += 1
    }

    const amount = toNumber(opportunity.estimated_amount)
    if (opportunity.stage === "closed_won") {
      wonAmount += amount
    } else if (opportunity.stage !== "closed_lost") {
      pipelineAmount += amount
    }
  }

  const now = Date.now()
  for (const task of tasks) {
    if (task.status && task.status in taskStatus) {
      taskStatus[task.status] += 1
    }

    if (
      task.status !== "completed" &&
      task.status !== "canceled" &&
      task.due_date &&
      new Date(task.due_date).getTime() < now
    ) {
      taskStatus.overdue += 1
    }
  }

  const ordersCount = [...trendBuckets.values()].reduce((sum, item) => sum + item.orders, 0)
  const avgOrderValue = ordersCount ? totalSales / ordersCount : 0
  const currencyCode = orders[0]?.currency_code ?? "aud"
  const netSales = totalSales - refundedTotal
  const topProducts = [...productMap.values()]
    .sort((a, b) => b.sales - a.sales || b.quantity - a.quantity)
    .slice(0, 10)

  return {
    range: {
      start: start.toISOString(),
      end: end.toISOString(),
      days,
    },
    currency_code: currencyCode,
    summary: {
      total_sales: totalSales,
      net_sales: netSales,
      orders_count: ordersCount,
      avg_order_value: avgOrderValue,
      new_customers: customers.length,
      active_customers: customerIds.size,
      open_tasks: taskStatus.open + taskStatus.in_progress,
      total_leads: leads.length,
      total_opportunities: opportunities.length,
      pipeline_amount: pipelineAmount,
      won_amount: wonAmount,
      refunded_total: refundedTotal,
      refunded_orders: refundedOrders,
      full_refund_orders: fullRefundOrders,
      partial_refund_orders: partialRefundOrders,
      canceled_orders: canceledOrders,
      canceled_sales: canceledSales,
      total_sales_display: formatCurrency(currencyCode, totalSales),
      net_sales_display: formatCurrency(currencyCode, netSales),
      avg_order_value_display: formatCurrency(currencyCode, avgOrderValue),
      pipeline_amount_display: formatCurrency(currencyCode, pipelineAmount),
      won_amount_display: formatCurrency(currencyCode, wonAmount),
      refunded_total_display: formatCurrency(currencyCode, refundedTotal),
      canceled_sales_display: formatCurrency(currencyCode, canceledSales),
    },
    sales_trend: [...trendBuckets.values()],
    top_products: topProducts,
    crm: {
      lead_status: leadStatus,
      opportunity_stage: opportunityStage,
      task_status: taskStatus,
      conversion_rate:
        leadStatus.qualified + leadStatus.lost > 0
          ? leadStatus.qualified / (leadStatus.qualified + leadStatus.lost)
          : 0,
    },
  }
}

function csvEscape(value: string | number) {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function buildReportCsv(report: Awaited<ReturnType<typeof buildReportSummary>>) {
  const lines: string[] = []

  lines.push("section,metric,label,value")
  lines.push(`summary,total_sales,,${csvEscape(report.summary.total_sales)}`)
  lines.push(`summary,net_sales,,${csvEscape(report.summary.net_sales)}`)
  lines.push(`summary,orders_count,,${csvEscape(report.summary.orders_count)}`)
  lines.push(`summary,avg_order_value,,${csvEscape(report.summary.avg_order_value)}`)
  lines.push(`summary,new_customers,,${csvEscape(report.summary.new_customers)}`)
  lines.push(`summary,active_customers,,${csvEscape(report.summary.active_customers)}`)
  lines.push(`summary,open_tasks,,${csvEscape(report.summary.open_tasks)}`)
  lines.push(`summary,total_leads,,${csvEscape(report.summary.total_leads)}`)
  lines.push(`summary,total_opportunities,,${csvEscape(report.summary.total_opportunities)}`)
  lines.push(`summary,pipeline_amount,,${csvEscape(report.summary.pipeline_amount)}`)
  lines.push(`summary,won_amount,,${csvEscape(report.summary.won_amount)}`)
  lines.push(`summary,refunded_total,,${csvEscape(report.summary.refunded_total)}`)
  lines.push(`summary,refunded_orders,,${csvEscape(report.summary.refunded_orders)}`)
  lines.push(`summary,full_refund_orders,,${csvEscape(report.summary.full_refund_orders)}`)
  lines.push(`summary,partial_refund_orders,,${csvEscape(report.summary.partial_refund_orders)}`)
  lines.push(`summary,canceled_orders,,${csvEscape(report.summary.canceled_orders)}`)
  lines.push(`summary,canceled_sales,,${csvEscape(report.summary.canceled_sales)}`)

  for (const point of report.sales_trend) {
    lines.push(`sales_trend,sales,${csvEscape(point.date)},${csvEscape(point.sales)}`)
    lines.push(`sales_trend,orders,${csvEscape(point.date)},${csvEscape(point.orders)}`)
  }

  for (const item of report.top_products) {
    lines.push(`top_products,sales,${csvEscape(item.title)},${csvEscape(item.sales)}`)
    lines.push(`top_products,quantity,${csvEscape(item.title)},${csvEscape(item.quantity)}`)
  }

  for (const [label, value] of Object.entries(report.crm.lead_status)) {
    lines.push(`lead_status,count,${csvEscape(label)},${csvEscape(value)}`)
  }

  for (const [label, value] of Object.entries(report.crm.opportunity_stage)) {
    lines.push(`opportunity_stage,count,${csvEscape(label)},${csvEscape(value)}`)
  }

  for (const [label, value] of Object.entries(report.crm.task_status)) {
    lines.push(`task_status,count,${csvEscape(label)},${csvEscape(value)}`)
  }

  return lines.join("\n")
}

export async function listOrderRecords(scope: ScopeLike, rawQuery: ReportSummaryQuery) {
  const { start, end } = createDateRange(rawQuery)

  return await fetchAllGraph<OrderRecord>(scope, {
    entity: "order",
    fields: [
      "id",
      "created_at",
      "total",
      "status",
      "currency_code",
      "customer_id",
      "canceled_at",
      "summary.refunded_total",
      "items.id",
      "items.title",
      "items.product_title",
      "items.quantity",
      "items.total",
      "items.subtotal",
    ],
    filters: {
      created_at: {
        $gte: start.toISOString(),
        $lte: end.toISOString(),
      },
    },
  })
}

export function buildOrderRows(
  orders: OrderRecord[],
  status: ReportOrderStatusFilter = ""
) {
  const rows = orders.map<ReportOrderRow>((order) => {
    const total = toNumber(order.total)
    const refundedTotal = toNumber(order.summary?.refunded_total)
    const isCanceled = order.status === "canceled" || Boolean(order.canceled_at)
    const refundState =
      refundedTotal <= 0 ? "none" : refundedTotal >= total ? "full" : "partial"

    return {
      id: order.id,
      created_at: order.created_at || "",
      status: order.status || "unknown",
      customer_id: order.customer_id ?? null,
      currency_code: order.currency_code || "aud",
      total,
      refunded_total: refundedTotal,
      is_canceled: isCanceled,
      refund_state: refundState,
      item_count: (order.items ?? []).length,
    }
  })

  return rows.filter((row) => {
    if (status === "active") return !row.is_canceled
    if (status === "canceled") return row.is_canceled
    if (status === "refunded") return row.refunded_total > 0
    return true
  })
}

export function buildProductRows(orders: OrderRecord[]) {
  const productMap = new Map<string, ReportProductRow>()

  for (const order of orders) {
    const isCanceled = order.status === "canceled" || Boolean(order.canceled_at)
    if (isCanceled) {
      continue
    }

    for (const item of order.items ?? []) {
      const title = item.product_title || item.title || "Untitled product"
      const current = productMap.get(title) ?? {
        title,
        quantity: 0,
        sales: 0,
        orders: 0,
      }

      current.quantity += toNumber(item.quantity)
      current.sales += toNumber(item.total) || toNumber(item.subtotal)
      current.orders += 1
      productMap.set(title, current)
    }
  }

  return [...productMap.values()].sort((a, b) => b.sales - a.sales || b.quantity - a.quantity)
}
