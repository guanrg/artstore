import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

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

export default async function sendTestEmail({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const notificationService = container.resolve(Modules.NOTIFICATION)

  const to = process.env.TEST_EMAIL_TO?.trim() || process.env.ADMIN_ORDER_NOTIFICATION_EMAIL?.trim()
  if (!to) {
    throw new Error("Missing TEST_EMAIL_TO or ADMIN_ORDER_NOTIFICATION_EMAIL in environment")
  }

  const smtp = getSmtpConfig()
  if (smtp) {
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
    await transporter.sendMail({
      from: smtp.from,
      to,
      subject: "Art Store Test Email",
      html: "<h2>Email channel is working.</h2><p>This is a test email from Medusa SMTP.</p>",
    })
    logger.info(`Test email sent via SMTP to ${to}`)
    return
  }

  await notificationService.createNotifications({
    to,
    channel: "email",
    trigger_type: "manual.test",
    resource_type: "system",
    idempotency_key: `manual-test-${Date.now()}`,
    content: {
      subject: "Art Store Test Email",
      html: "<h2>Email channel is working.</h2><p>This is a test email from Medusa.</p>",
    },
    data: {
      sent_at: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    },
  })

  logger.info(`Test email queued to ${to}`)
}
