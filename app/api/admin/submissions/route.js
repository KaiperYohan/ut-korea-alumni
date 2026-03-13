import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { rows } = await sql`
    SELECT n.*, m.name as author_name, m.email as author_email
    FROM news n
    LEFT JOIN members m ON n.author_id = m.id
    WHERE n.approval_status = 'pending'
    ORDER BY n.created_at DESC
  `

  return Response.json({ submissions: rows })
}
