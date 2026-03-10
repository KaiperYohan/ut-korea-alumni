import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const status = body.status || 'attending'

  // Upsert RSVP
  await sql`
    INSERT INTO event_rsvps (event_id, member_id, status)
    VALUES (${parseInt(id)}, ${parseInt(session.user.id)}, ${status})
    ON CONFLICT (event_id, member_id)
    DO UPDATE SET status = ${status}
  `

  return Response.json({ success: true })
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  await sql`
    DELETE FROM event_rsvps
    WHERE event_id = ${parseInt(id)} AND member_id = ${parseInt(session.user.id)}
  `

  return Response.json({ success: true })
}
