import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { CreateNotificationDTO } from "@medusajs/types"

type OrderData = {
  id: string
  display_id?: number | string
  email?: string
  currency_code?: string
  total?: number
  created_at?: string
  items?: Array<{ title?: string; quantity?: number }>
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function formatAud(amount: unknown) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2,
  }).format(toNumber(amount))
}

function buildItemsHtml(order: OrderData) {
  const items = order.items ?? []
  if (!items.length) {
    return "<li>Items unavailable</li>"
  }

  return items
    .map((item) => {
      const title = item.title || "Item"
      const qty = item.quantity ?? 0
      return `<li>${title} x ${qty}</li>`
    })
    .join("")
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback
  }
  return value.toLowerCase() === "true"
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim()
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()

  if (!host || !user || !pass) {
    return null
  }

  const port = Number(process.env.SMTP_PORT || "465")
  const secure = parseBoolean(process.env.SMTP_SECURE, port === 465)

  return {
    host,
    port: Number.isFinite(port) ? port : 465,
    secure,
    user,
    pass,
    from: process.env.SMTP_FROM?.trim() || user,
  }
}

export default async function orderEmailNotificationSubscriber({
  event,
  container,
}: SubscriberArgs<{ id?: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notificationService = container.resolve(Modules.NOTIFICATION)

  const orderId = event.data?.id
  if (!orderId) {
    return
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email", "currency_code", "total", "created_at", "items.title", "items.quantity"],
    filters: { id: orderId },
  })

  const order = orders?.[0] as OrderData | undefined
  if (!order?.id) {
    logger.warn(`Order email subscriber: order not found for ${orderId}`)
    return
  }

  const displayId = order.display_id ?? order.id
  const orderCode = `#${displayId}`
  const orderTotal = formatAud(order.total)
  const createdAt = order.created_at ? new Date(order.created_at).toLocaleString("en-AU") : "N/A"

  const customerEmail = order.email?.trim()
  const adminEmail = process.env.ADMIN_ORDER_NOTIFICATION_EMAIL?.trim()
  const sendCustomerCopy = (process.env.SEND_CUSTOMER_ORDER_CONFIRMATION ?? "true").toLowerCase() !== "false"
  const smtp = getSmtpConfig()

  const customerPayload = customerEmail && sendCustomerCopy
    ? {
        to: customerEmail,
        subject: `Order Confirmation ${orderCode} - Art Store`,
        html: `
          <h2>Thank you for your order</h2>
          <p>Your order <strong>${orderCode}</strong> has been placed successfully.</p>
          <p>Total: <strong>${orderTotal}</strong></p>
          <p>Placed at: ${createdAt}</p>
          <p>Items:</p>
          <ul>${buildItemsHtml(order)}</ul>
        `,
      }
    : null

  const adminPayload = adminEmail
    ? {
        to: adminEmail,
        subject: `New Order ${orderCode} - Art Store`,
        html: `
          <h2>New order received</h2>
          <p>Order: <strong>${orderCode}</strong></p>
          <p>Customer: ${customerEmail || "N/A"}</p>
          <p>Total: <strong>${orderTotal}</strong></p>
          <p>Placed at: ${createdAt}</p>
          <p>Items:</p>
          <ul>${buildItemsHtml(order)}</ul>
        `,
      }
    : null

  if (smtp) {
    try {
      // Lazy load to avoid hard dependency when SMTP is not used.
      const nodemailer = require("nodemailer") as {
        createTransport: (config: Record<string, unknown>) => {
          sendMail: (input: Record<string, unknown>) => Promise<unknown>
        }
      }
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: {
          user: smtp.user,
          pass: smtp.pass,
        },
      })

      const tasks: Promise<unknown>[] = []
      if (customerPayload) {
        tasks.push(
          transporter.sendMail({
            from: smtp.from,
            to: customerPayload.to,
            subject: customerPayload.subject,
            html: customerPayload.html,
          }),
        )
      }
      if (adminPayload) {
        tasks.push(
          transporter.sendMail({
            from: smtp.from,
            to: adminPayload.to,
            subject: adminPayload.subject,
            html: adminPayload.html,
          }),
        )
      }

      if (!tasks.length) {
        logger.info("Order email subscriber: skipped because no recipient is configured")
        return
      }

      await Promise.all(tasks)
      logger.info(`Order email subscriber: sent ${tasks.length} SMTP email(s) for ${order.id}`)
      return
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`Order email subscriber SMTP failed for ${order.id}: ${message}`)
      // Fall through to Medusa notification module fallback below.
    }
  }

  const notifications: CreateNotificationDTO[] = []

  if (customerPayload) {
    notifications.push({
      to: customerPayload.to,
      channel: "email",
      trigger_type: "order.placed",
      resource_id: order.id,
      resource_type: "order",
      idempotency_key: `order-confirmation-customer-${order.id}`,
      content: {
        subject: customerPayload.subject,
        html: customerPayload.html,
      },
      data: {
        order_id: order.id,
        display_id: displayId,
      },
    })
  }

  if (adminPayload) {
    notifications.push({
      to: adminPayload.to,
      channel: "email",
      trigger_type: "order.placed",
      resource_id: order.id,
      resource_type: "order",
      idempotency_key: `order-confirmation-admin-${order.id}`,
      content: {
        subject: adminPayload.subject,
        html: adminPayload.html,
      },
      data: {
        order_id: order.id,
        display_id: displayId,
      },
    })
  }

  if (!notifications.length) {
    logger.info("Order email subscriber: skipped because no recipient is configured")
    return
  }

  try {
    await notificationService.createNotifications(notifications)
    logger.info(`Order email subscriber: queued ${notifications.length} notification(s) for ${order.id}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`Order email subscriber failed for ${order.id}: ${message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
  context: {
    subscriberId: "order-email-notification-handler",
  },
}
