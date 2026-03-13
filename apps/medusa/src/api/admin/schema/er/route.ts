import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Client } from "pg"

const TABLES_SQL = `
SELECT
  c.table_schema,
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable
FROM information_schema.columns c
WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY c.table_schema, c.table_name, c.ordinal_position
`

const FK_SQL = `
SELECT
  tc.constraint_name,
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY tc.table_schema, tc.table_name, tc.constraint_name, kcu.ordinal_position
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
    const [tablesResult, fkResult] = await Promise.all([
      client.query(TABLES_SQL),
      client.query(FK_SQL),
    ])

    const tableSet = new Set<string>()
    for (const row of tablesResult.rows) {
      tableSet.add(`${row.table_schema}.${row.table_name}`)
    }

    res.status(200).json({
      generated_at: new Date().toISOString(),
      table_count: tableSet.size,
      column_count: tablesResult.rowCount ?? tablesResult.rows.length,
      relation_count: fkResult.rowCount ?? fkResult.rows.length,
      columns: tablesResult.rows,
      relations: fkResult.rows,
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
