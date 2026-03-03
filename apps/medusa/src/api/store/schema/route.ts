import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Client } from "pg"

const SCHEMA_SQL = `
SELECT
  c.table_schema,
  c.table_name,
  COALESCE(obj_description((quote_ident(c.table_schema)||'.'||quote_ident(c.table_name))::regclass), '') AS table_comment,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  COALESCE(c.column_default, '') AS column_default,
  COALESCE(col_description((quote_ident(c.table_schema)||'.'||quote_ident(c.table_name))::regclass, c.ordinal_position), '') AS column_comment
FROM information_schema.columns c
WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY c.table_schema, c.table_name, c.ordinal_position
`

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    res.status(500).json({
      message: "DATABASE_URL is not configured",
    })
    return
  }

  const client = new Client({ connectionString: databaseUrl })

  try {
    await client.connect()
    const result = await client.query(SCHEMA_SQL)
    const tableSet = new Set<string>()

    for (const row of result.rows) {
      tableSet.add(`${row.table_schema}.${row.table_name}`)
    }

    res.status(200).json({
      generated_at: new Date().toISOString(),
      table_count: tableSet.size,
      column_count: result.rowCount ?? result.rows.length,
      rows: result.rows,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    res.status(500).json({ message })
  } finally {
    await client.end().catch(() => {
      // ignore close errors to avoid masking query errors
    })
  }
}
