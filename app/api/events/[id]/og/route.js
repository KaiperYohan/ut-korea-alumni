import { sql } from '@/lib/db'
import { eventImages } from '@/lib/eventMeta'
import { ogCardResponse } from '@/lib/ogCard'

// The link-preview image for an event, made from its main image.
export async function GET(request, { params }) {
  const { id } = await params
  const eventId = parseInt(id, 10)
  if (!Number.isInteger(eventId)) return new Response('Not found', { status: 404 })

  const { rows: [event] } = await sql`SELECT image_url FROM events WHERE id = ${eventId}`
  const [main] = eventImages(event?.image_url)
  if (!main) return new Response('Not found', { status: 404 })

  return ogCardResponse(main, `Event ${eventId}`)
}
