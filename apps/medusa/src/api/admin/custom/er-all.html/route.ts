import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { readFile } from "node:fs/promises"
import path from "node:path"

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  try {
    const htmlPath = path.resolve(process.cwd(), "../../docs/er-all.html")
    const html = await readFile(htmlPath, "utf8")
    res.setHeader("content-type", "text/html; charset=utf-8")
    res.status(200).send(html)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load ER HTML"
    res.status(500).json({ message })
  }
}
