import crypto from 'crypto'

// Helpers for an event's link preview (the card KakaoTalk, Slack and others show
// when an event link is shared).

// image_url holds a JSON array of Blob URLs, or a single bare URL on older events.
export function eventImages(imageUrl) {
  if (!imageUrl) return []
  try {
    const parsed = JSON.parse(imageUrl)
    return (Array.isArray(parsed) ? parsed : [imageUrl]).filter(Boolean)
  } catch {
    return [imageUrl]
  }
}

// event_date is text "YYYY-MM-DDTHH:mm" in KST.
export function eventWhen(event) {
  const raw = (event.event_date || '').slice(0, 16)
  if (!raw) return ''
  const d = new Date(`${raw}:00+09:00`)
  if (Number.isNaN(d.getTime())) return ''
  const date = d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' })
  const day = `${date} (${d.toLocaleDateString('ko-KR', { weekday: 'short', timeZone: 'Asia/Seoul' })})`
  if (event.time_tba) return day
  return `${day} ${d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Seoul' })}`
}

// Changes whenever the main image does, so a preview cached by a chat app under
// the old image URL is not reused after the image is replaced.
export function imageVersion(url) {
  return crypto.createHash('sha1').update(url).digest('hex').slice(0, 10)
}
