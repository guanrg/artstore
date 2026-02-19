import { NextResponse } from "next/server"
import { CUSTOMER_TOKEN_COOKIE } from "@/lib/medusa-server"

export async function POST() {
  const res = NextResponse.json({ success: true })
  res.cookies.set(CUSTOMER_TOKEN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
  return res
}
