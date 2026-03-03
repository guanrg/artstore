import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type ResetPasswordEventData = {
  entity_id?: string
  actor_type?: string
  token?: string
  metadata?: Record<string, unknown>
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

function buildResetUrl(metadata: Record<string, unknown> | undefined, token: string) {
  const metadataUrl =
    typeof metadata?.reset_url === "string"
      ? metadata.reset_url
      : typeof metadata?.resetUrl === "string"
        ? metadata.resetUrl
        : ""

  const base =
    metadataUrl.trim() ||
    process.env.PASSWORD_RESET_URL_BASE?.trim() ||
    "http://localhost:3000/account/reset-password"

  try {
    const url = new URL(base)
    url.searchParams.set("token", token)
    return url.toString()
  } catch {
    const sep = base.includes("?") ? "&" : "?"
    return `${base}${sep}token=${encodeURIComponent(token)}`
  }
}

export default async function authPasswordResetEmailSubscriber({
  event,
  container,
}: SubscriberArgs<ResetPasswordEventData>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const smtp = getSmtpConfig()
  if (!smtp) {
    logger.warn("Password reset email subscriber skipped: SMTP is not configured")
    return
  }

  const payload = event.data || {}
  const email = (payload.entity_id || "").trim()
  const token = (payload.token || "").trim()
  if (!email || !token) {
    return
  }

  const resetUrl = buildResetUrl(payload.metadata, token)

  try {
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
      to: email,
      subject: "Reset your password - Art Store",
      html: `
        <h2>Password reset request</h2>
        <p>We received a request to reset your password.</p>
        <p>
          <a href="${resetUrl}" target="_blank" rel="noopener noreferrer">Reset password</a>
        </p>
        <p>If the button doesn't work, copy this link:</p>
        <p>${resetUrl}</p>
        <p>This link expires in 15 minutes.</p>
      `,
    })

    logger.info(`Password reset email sent to ${email}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`Password reset email failed for ${email}: ${message}`)
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
  context: {
    subscriberId: "auth-password-reset-email-handler",
  },
}
