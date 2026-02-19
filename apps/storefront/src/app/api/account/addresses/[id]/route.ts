import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { CUSTOMER_TOKEN_COOKIE, medusaRequest } from "@/lib/medusa-server"

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = (await cookies()).get(CUSTOMER_TOKEN_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ message: "Not logged in" }, { status: 401 })
  }

  const deleted = await medusaRequest<Record<string, unknown>>(`/store/customers/me/addresses/${id}`, {
    method: "DELETE",
    token,
  })
  if (!deleted.ok) {
    return NextResponse.json({ message: deleted.message }, { status: deleted.status })
  }
  return NextResponse.json(deleted.data)
}
