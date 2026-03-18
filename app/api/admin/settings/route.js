import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { rows } = await sql`SELECT key, value FROM site_settings`
  const settings = {}
  for (const row of rows) {
    settings[row.key] = row.value
  }
  return Response.json({ settings })
}

export async function PUT(request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { settings } = await request.json()

  for (const [key, value] of Object.entries(settings)) {
    const trimmed = (value || '').trim()
    if (trimmed) {
      await sql`
        INSERT INTO site_settings (key, value)
        VALUES (${key}, ${trimmed})
        ON CONFLICT (key) DO UPDATE SET value = ${trimmed}, updated_at = NOW()
      `
    } else {
      await sql`DELETE FROM site_settings WHERE key = ${key}`
    }
  }

  return Response.json({ success: true })
}
