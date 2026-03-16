import { sql } from '@/lib/db'

export async function GET() {
  try {
    const { rows } = await sql`SELECT key, value FROM site_settings`
    const settings = {}
    for (const row of rows) {
      settings[row.key] = row.value
    }
    return Response.json({ settings })
  } catch {
    return Response.json({ settings: {} })
  }
}
