import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { action } = await request.json()

  if (action === 'approve') {
    await sql`
      UPDATE news SET
        approval_status = 'approved',
        published = true,
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
    `
  } else if (action === 'reject') {
    await sql`
      UPDATE news SET
        approval_status = 'rejected',
        published = false,
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
    `
  } else {
    return Response.json({ error: 'Invalid action' }, { status: 400 })
  }

  return Response.json({ success: true })
}
