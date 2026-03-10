import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request, { params }) {
  const { id } = await params

  const { rows: events } = await sql`
    SELECT e.*, m.name as creator_name,
      (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND status = 'attending') as attendee_count
    FROM events e
    LEFT JOIN members m ON e.created_by = m.id
    WHERE e.id = ${parseInt(id)}
  `

  if (events.length === 0) {
    return Response.json({ error: 'Event not found' }, { status: 404 })
  }

  // Get RSVPs
  const { rows: rsvps } = await sql`
    SELECT er.*, m.name, m.name_ko
    FROM event_rsvps er
    JOIN members m ON er.member_id = m.id
    WHERE er.event_id = ${parseInt(id)}
    ORDER BY er.created_at DESC
  `

  return Response.json({ event: events[0], rsvps })
}

export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { title, titleKo, description, descriptionKo, eventDate, endDate, location, locationKo, imageUrl, maxAttendees } = body

  await sql`
    UPDATE events SET
      title = ${title}, title_ko = ${titleKo || null},
      description = ${description || null}, description_ko = ${descriptionKo || null},
      event_date = ${eventDate}, end_date = ${endDate || null},
      location = ${location || null}, location_ko = ${locationKo || null},
      image_url = ${imageUrl || null}, max_attendees = ${maxAttendees ? parseInt(maxAttendees) : null}
    WHERE id = ${parseInt(id)}
  `

  return Response.json({ success: true })
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await sql`DELETE FROM events WHERE id = ${parseInt(id)}`
  return Response.json({ success: true })
}
