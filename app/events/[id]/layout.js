import { sql } from '@/lib/db'
import { eventImages, eventWhen, imageVersion } from '@/lib/eventMeta'

// The event page itself is a client component, so its link preview is set here:
// the event's own title, date, place and main image instead of the site-wide card.
// openGraph and twitter replace the root layout's objects rather than merging with
// them, so the shared fields are repeated.
const SITE_IMAGE = { url: '/grand reunion.jpg', width: 1200, height: 630, alt: 'UT Austin Korea Alumni Association' }

export async function generateMetadata({ params }) {
  const { id } = await params
  const eventId = parseInt(id, 10)
  if (!Number.isInteger(eventId)) return {}

  let event
  try {
    ;({ rows: [event] } = await sql`
      SELECT id, title, title_ko, description, description_ko, event_date, time_tba,
             location, location_ko, location_tba, image_url
      FROM events WHERE id = ${eventId}`)
  } catch (error) {
    console.error('Event metadata query failed:', error.message)
    return {}
  }
  if (!event) return {}

  const title = event.title_ko && event.title && event.title_ko !== event.title
    ? `${event.title_ko} · ${event.title}`
    : event.title_ko || event.title || 'Event'
  const place = event.location_tba ? '' : (event.location_ko || event.location || '')
  const about = String(event.description_ko || event.description || '').replace(/\s+/g, ' ').trim()
  const lead = [eventWhen(event), place].filter(Boolean).join(' · ')
  const full = [lead, about].filter(Boolean).join(' — ')
  const description = full.length > 160 ? `${full.slice(0, 159).trimEnd()}…` : full

  const [main] = eventImages(event.image_url)
  const image = main
    ? { url: `/api/events/${event.id}/og?v=${imageVersion(main)}`, width: 1200, height: 630, alt: title }
    : SITE_IMAGE
  const url = `/events/${event.id}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'ko_KR',
      alternateLocale: 'en_US',
      siteName: 'UT Austin Korea Alumni Association',
      url,
      title,
      description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.url],
    },
  }
}

export default function EventLayout({ children }) {
  return children
}
