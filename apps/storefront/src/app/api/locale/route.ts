import { NextRequest, NextResponse } from "next/server"
import { normalizeLocale } from "@/lib/i18n-dict"

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { locale?: string }
  const locale = normalizeLocale(body?.locale)

  const res = NextResponse.json({ ok: true, locale })
  res.cookies.set("locale", locale, {
    httpOnly: false,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
  return res
}

