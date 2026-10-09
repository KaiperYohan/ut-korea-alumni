// Image area for a birthday post that has no image of its own. Birthday posts are
// generated daily by the birthday cron without one, and they are most of the news
// feed, so the generic empty placeholder made the feed look unfinished.
//
// Fills its parent (absolute inset-0), so it drops into any card image slot.
// Only use it for subcategory 'birthday' — other imageless posts include
// obituaries, which must not get a celebratory image.
//
// photoUrl is the birthday member's profile photo. The news API only sends it to
// signed-in viewers, since those photos were shared in the members-only directory
// rather than with the public; everyone else gets the illustrated card.

// Fixed confetti positions so the art renders identically on server and client.
const CONFETTI = [
  { top: '14%', left: '12%', size: 6, color: 'bg-gold-light' },
  { top: '22%', left: '84%', size: 8, color: 'bg-white/70' },
  { top: '68%', left: '8%', size: 5, color: 'bg-white/60' },
  { top: '76%', left: '88%', size: 6, color: 'bg-gold' },
  { top: '10%', left: '56%', size: 4, color: 'bg-white/80' },
  { top: '84%', left: '40%', size: 5, color: 'bg-gold-light' },
  { top: '40%', left: '93%', size: 4, color: 'bg-white/60' },
  { top: '48%', left: '4%', size: 6, color: 'bg-gold-light/80' },
]

export default function BirthdayArt({ name, year, photoUrl, locale = 'en' }) {
  const heading = locale === 'ko' ? '생일 축하합니다' : 'Happy Birthday'
  const classTag = year ? `'${String(year).slice(-2)}` : ''

  if (photoUrl) {
    return (
      <div className="absolute inset-0">
        <img src={photoUrl} alt={name || ''} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-burnt-deep/70 via-transparent to-transparent" />
        <span className="absolute top-3 right-3 text-[0.65rem] font-semibold bg-white/90 text-burnt-orange px-2.5 py-1 rounded-full">
          🎂 {heading}
        </span>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-burnt-orange via-burnt-dark to-burnt-deep overflow-hidden" aria-hidden="true">
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className={`absolute rounded-full ${c.color}`}
          style={{ top: c.top, left: c.left, width: c.size, height: c.size }}
        />
      ))}
      <div className="absolute -right-6 -bottom-8 w-32 h-32 rounded-full bg-white/5" />
      <div className="absolute -left-8 -top-10 w-28 h-28 rounded-full bg-white/5" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <span className="text-4xl leading-none mb-2 drop-shadow-sm">🎂</span>
        <span className="font-display text-white text-sm font-semibold tracking-wide">{heading}</span>
        {name && (
          <span className="font-display text-white/95 text-lg font-bold leading-tight mt-0.5 line-clamp-1">
            {name}{classTag && <span className="text-white/70 font-semibold text-base"> {classTag}</span>}
          </span>
        )}
      </div>
    </div>
  )
}
