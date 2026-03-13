import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canCreateEvent } from '@/lib/permissions'

export async function GET() {
  const { rows: events } = await sql`
    SELECT e.*, m.name as creator_name,
      (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND status = 'attending') as attendee_count
    FROM events e
    LEFT JOIN members m ON e.created_by = m.id
    ORDER BY e.event_date DESC
  `
  return Response.json({ events })
}

export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canCreateEvent(session.user.membershipLevel, session.user.isAdmin)) {
    return Response.json({ error: 'Event creation requires Executive membership or Admin' }, { status: 403 })
  }

  const body = await request.json()
  const { title, titleKo, description, descriptionKo, eventDate, endDate, location, locationKo, imageUrl, maxAttendees } = body

  if (!title || !eventDate) {
    return Response.json({ error: 'Title and date are required' }, { status: 400 })
  }

  const { rows } = await sql`
    INSERT INTO events (title, title_ko, description, description_ko, event_date, end_date, location, location_ko, image_url, max_attendees, created_by)
    VALUES (${title}, ${titleKo || null}, ${description || null}, ${descriptionKo || null}, ${eventDate}, ${endDate || null}, ${location || null}, ${locationKo || null}, ${imageUrl || null}, ${maxAttendees ? parseInt(maxAttendees) : null}, ${parseInt(session.user.id)})
    RETURNING *
  `

  return Response.json({ event: rows[0] })
}
