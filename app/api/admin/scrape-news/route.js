import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseStringPromise } from 'xml2js'

const SITE_BASE = 'https://www.sxsk.news'
const SITEMAP_URL = `${SITE_BASE}/sitemap.xml`

// The archive is indexed by two tag pages, one per language. Each post-card on
// them carries the URL, publish date, title, excerpt and feature image, so a
// full sync is two requests instead of one per article. The article pages
// themselves no longer expose a publish date at all (no article:published_time,
// no <time>, no JSON-LD), which is why these listings are the source of truth.
const TAG_PAGES = {
  en: `${SITE_BASE}/tag/english/`,
  ko: `${SITE_BASE}/tag/korean/`,
}

// Pages in the sitemap that are navigation, not articles.
const NAV_PATHS = new Set([
  '/', '/tag/english/', '/tag/korean/',
  '/about/', '/about-en/', '/about-ko/',
  '/subscribe/', '/subscribe-en/', '/subscribe-ko/',
  '/alumni-news/', '/publishers-letter/', '/texas-news/',
  '/ut-member-interview/', '/ut-stories/', '/utaka-news/',
])

function decodeEntities(str) {
  if (!str) return str
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function stripHtml(html) {
  if (!html) return ''
  return decodeEntities(html.replace(/<[^>]*>/g, '')).replace(/&nbsp;/g, ' ').trim()
}

function absolute(url) {
  if (!url) return null
  return url.startsWith('http') ? url : SITE_BASE + url
}

// "Aug 16, 2026" -> ISO string. Parsed as UTC so the date can't drift a day
// depending on where the server happens to run.
function parseCardDate(text) {
  if (!text) return null
  const ms = Date.parse(`${text} UTC`)
  return Number.isNaN(ms) ? null : new Date(ms).toISOString()
}

async function fetchCards(lang) {
  const res = await fetch(TAG_PAGES[lang], { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`${TAG_PAGES[lang]} returned HTTP ${res.status}`)
  const html = await res.text()

  const blocks = html.split('<article class="post-card"').slice(1)
  const cards = blocks.map((block, order) => {
    const href = block.match(/<a href="([^"]+)"/)
    const title = block.match(/<h2>([\s\S]*?)<\/h2>/)
    if (!href || !title) return null
    const meta = block.match(/<div class="post-meta">([\s\S]*?)<\/div>/)
    const excerpt = block.match(/<p>([\s\S]*?)<\/p>/)
    const image = block.match(/<img src="([^"]+)"/)
    const metaDate = meta ? decodeEntities(meta[1]).split('·')[0].trim() : ''
    return {
      lang,
      order,
      url: absolute(href[1]),
      title: stripHtml(title[1]),
      description: excerpt ? stripHtml(excerpt[1]) : '',
      imageUrl: absolute(image ? image[1] : null),
      pubDate: parseCardDate(metaDate),
    }
  }).filter(Boolean)

  // The theme renders these cards. If it changes shape we want a clear failure
  // rather than a sync that silently imports nothing.
  if (!cards.length) {
    throw new Error(`No post-cards found on ${TAG_PAGES[lang]} — the site theme markup has probably changed.`)
  }
  return cards
}

// Used only to sanity-check that the tag listings still cover the whole archive.
async function countSitemapArticles() {
  try {
    const res = await fetch(SITEMAP_URL, { next: { revalidate: 0 } })
    if (!res.ok) return null
    const parsed = await parseStringPromise(await res.text(), { explicitArray: false })
    const urls = parsed?.urlset?.url
    if (!urls) return null
    const items = Array.isArray(urls) ? urls : [urls]
    return items.filter(u => !NAV_PATHS.has(String(u.loc).replace(SITE_BASE, ''))).length
  } catch {
    return null
  }
}

function normalizeText(str) {
  return str
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .toLowerCase()
    .trim()
}

// Section mapping for EN/KO matching (both directions)
const SECTION_PAIRS = [
  [["publisher's letter"], ['발행인의 글']],
  [['utaka news'], ['utaka 소식']],
  [['alumni news'], ['동문 이야기']],
  [['ut stories'], ['ut 소식']],
  [['texas news'], ['texas 소식']],
  [['ut member interview', 'ut interview'], ['ut 구성원 인터뷰']],
  [['lifestyle'], ['라이프스타일']],
  [['careers', 'career', 'job posting', 'job postings'], ['커리어', '채용공고']],
  [['call for submittals'], ['제보 받습니다']],
  [['features'], ['특집 기사']],
  [['corrections & clarifications'], ['바로잡습니다']],
]

const KNOWN_SECTIONS = SECTION_PAIRS.flatMap(([en, ko]) => [...en, ...ko])

// Volume and section both live in the title: "Vol. 8 [Texas News] ..." or
// "제8호 [Texas 소식] ...". Issue cover pages have no [section] bracket.
function extractSection(title) {
  const normalized = normalizeText(title)
  const volMatch = normalized.match(/vol\.?\s*(\d+)/) || title.match(/제\s*(\d+)\s*호/)
  const vol = volMatch ? volMatch[1] : null
  const sectionMatch = title.match(/\[([^\]]+)\]/)
  const section = sectionMatch ? normalizeText(sectionMatch[1]) : null
  const isCover = /^sxsk\s+(vol\.?|제)/i.test(title.trim())
  return { vol, section, isCover }
}

function sectionsMatch(sectionA, sectionB) {
  if (!sectionA || !sectionB) return 0
  if (sectionA === sectionB) return 1
  for (const [enNames, koNames] of SECTION_PAIRS) {
    const allNames = [...enNames, ...koNames]
    if (allNames.includes(sectionA) && allNames.includes(sectionB)) return 1
  }
  if (KNOWN_SECTIONS.includes(sectionA) && KNOWN_SECTIONS.includes(sectionB)) return -1
  return 0
}

// Canonical bucket key so an article and its translation land together.
function bucketKey(title) {
  const { vol, section, isCover } = extractSection(title)
  if (isCover) return `${vol}|__cover__`
  const canonical = SECTION_PAIRS.find(([en, ko]) => [...en, ...ko].includes(section))
  return `${vol}|${canonical ? canonical[0][0] : section}`
}

// Signals that survive translation: shared emoji, and Latin-script proper nouns
// (names, companies, degree codes) which stay verbatim in the Korean text.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu
const LATIN = /[A-Za-z][A-Za-z.'’-]{2,}|\b\d{4}\b/g
const LATIN_STOPWORDS = new Set([
  'vol', 'the', 'and', 'for', 'with', 'from', 'are', 'was', 'new', 'has', 'its',
  'his', 'her', 'their', 'this', 'that', 'you', 'your', 'our', 'all', 'out',
  'how', 'who', 'what', 'when', 'part', 'texas', 'news', 'utaka', 'sxsk',
  'stories', 'lifestyle', 'careers', 'interview', 'member', 'alumni', 'letter',
  'publisher', 'features', 'corrections', 'clarifications', 'call', 'submittals',
  'first', 'thursday',
])

function emojiTokens(text) {
  return [...new Set(text.match(EMOJI) || [])]
}

function latinTokens(text) {
  const withoutSection = text.replace(/\[[^\]]*\]/g, '')
  const found = withoutSection.match(LATIN) || []
  return [...new Set(
    found
      .map(t => t.toLowerCase().replace(/[.'’-]+$/, ''))
      .filter(t => t.length > 2 && !LATIN_STOPWORDS.has(t))
  )]
}

function slugOf(url) {
  return String(url).replace(SITE_BASE, '').replace(/^\/|\/$/g, '')
}

// Returns null when the two can't be the same article, otherwise a confidence score.
function scorePair(en, ko, enPos, koPos) {
  const a = extractSection(en.title)
  const b = extractSection(ko.title)

  if (a.vol && b.vol && a.vol !== b.vol) return null
  if (a.isCover !== b.isCover) return null
  const sectionResult = sectionsMatch(a.section, b.section)
  if (sectionResult === -1) return null

  let score = 0
  if (a.vol && b.vol && a.vol === b.vol) score += 10
  if (sectionResult === 1) score += 5

  // Some English posts are published as the Korean slug plus "-eng".
  const enSlug = slugOf(en.url)
  if (enSlug.endsWith('-eng') && slugOf(ko.url) === enSlug.slice(0, -4)) score += 100

  score += 6 * emojiTokens(en.title).filter(t => emojiTokens(ko.title).includes(t)).length

  const enLatin = latinTokens(`${en.title} ${en.description}`)
  const koLatin = latinTokens(`${ko.title} ${ko.description}`)
  score += 4 * enLatin.filter(t => koLatin.includes(t)).length

  if (en.imageUrl && ko.imageUrl && en.imageUrl === ko.imageUrl) score += 8
  if (en.pubDate && ko.pubDate && en.pubDate.slice(0, 10) === ko.pubDate.slice(0, 10)) score += 2

  // Both editions run their articles in the same order within an issue section,
  // which breaks ties the text signals alone can't separate.
  if (enPos !== null && enPos === koPos) score += 3

  return score
}

// Global greedy assignment: strongest pairs claim each other first, so a weak
// candidate can't steal an article that is a better match for something else.
function matchArticles(enItems, koItems) {
  const positionOf = (items) => {
    const seen = new Map()
    return items.map(item => {
      const key = bucketKey(item.title)
      const next = seen.get(key) ?? 0
      seen.set(key, next + 1)
      return next
    })
  }
  const enPos = positionOf(enItems)
  const koPos = positionOf(koItems)

  const candidates = []
  enItems.forEach((en, ei) => {
    koItems.forEach((ko, ki) => {
      const sameBucket = bucketKey(en.title) === bucketKey(ko.title)
      const score = scorePair(en, ko, sameBucket ? enPos[ei] : null, sameBucket ? koPos[ki] : null)
      if (score !== null && score >= 5) candidates.push({ ei, ki, score })
    })
  })
  // Ties resolve by listing order so repeated syncs pair identically.
  candidates.sort((x, y) => y.score - x.score || x.ei - y.ei || x.ki - y.ki)

  const takenEn = new Map()
  const takenKo = new Set()
  for (const c of candidates) {
    if (takenEn.has(c.ei) || takenKo.has(c.ki)) continue
    takenEn.set(c.ei, c.ki)
    takenKo.add(c.ki)
  }

  const matched = enItems.map((en, ei) => ({
    en,
    ko: takenEn.has(ei) ? koItems[takenEn.get(ei)] : null,
  }))
  koItems.forEach((ko, ki) => {
    if (!takenKo.has(ki)) matched.push({ en: null, ko })
  })
  return matched
}

function categorize(title) {
  const refTitle = title.toLowerCase()
  if (/\[utaka\s*news\]|\[utaka\s*소식\]/.test(refTitle)) {
    return { category: 'utaka_news', subcategory: null }
  }
  if (/\[ut\s*member\s*interview\]|\[ut\s*구성원\s*인터뷰\]/.test(refTitle)) {
    return { category: 'members_news', subcategory: 'interview' }
  }
  if (/\[careers?\]|\[job\s*postings?\]|\[채용공고\]|\[커리어\]/.test(refTitle)) {
    return { category: 'pr', subcategory: null }
  }
  return { category: 'sxsk', subcategory: null }
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { rows } = await sql`
      DELETE FROM news
      WHERE (external_url IS NOT NULL AND external_url LIKE 'https://www.sxsk.news%')
         OR (external_url_ko IS NOT NULL AND external_url_ko LIKE 'https://www.sxsk.news%')
      RETURNING id
    `
    return Response.json({ success: true, deleted: rows.length })
  } catch (error) {
    console.error('Clear scraped news error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [enItems, koItems] = await Promise.all([fetchCards('en'), fetchCards('ko')])

    // Cross-check against the sitemap so a listing that quietly stops showing
    // the full archive gets surfaced instead of silently under-importing.
    const sitemapCount = await countSitemapArticles()
    const warning = sitemapCount !== null && sitemapCount !== enItems.length + koItems.length
      ? `Tag listings returned ${enItems.length + koItems.length} posts but the sitemap lists ${sitemapCount} articles.`
      : null

    const { rows: existing } = await sql`
      SELECT external_url, external_url_ko FROM news
      WHERE external_url IS NOT NULL OR external_url_ko IS NOT NULL
    `
    const existingUrls = new Set()
    for (const r of existing) {
      if (r.external_url) existingUrls.add(r.external_url)
      if (r.external_url_ko) existingUrls.add(r.external_url_ko)
    }

    const pairs = matchArticles(enItems, koItems)

    let imported = 0
    let skipped = 0
    let updated = 0

    for (const { en, ko } of pairs) {
      const enUrl = en?.url || null
      const koUrl = ko?.url || null

      const enExists = enUrl && existingUrls.has(enUrl)
      const koExists = koUrl && existingUrls.has(koUrl)
      if (enExists || koExists) {
        if (enUrl && koUrl && enExists && !koExists) {
          await sql`
            UPDATE news SET external_url_ko = ${koUrl}
            WHERE external_url = ${enUrl} AND (external_url_ko IS NULL OR external_url_ko = '')
          `
          existingUrls.add(koUrl)
          updated++
        }
        skipped++
        continue
      }

      const primary = en || ko
      const title = primary.title
      const titleKo = ko ? ko.title : null
      const content = primary.description
      const contentKo = ko ? ko.description : null
      const imageUrl = en?.imageUrl || ko?.imageUrl || null
      const pubDate = en?.pubDate || ko?.pubDate || new Date().toISOString()
      const { category, subcategory } = categorize(primary.title)

      await sql`
        INSERT INTO news (title, title_ko, content, content_ko, external_url, external_url_ko, image_url, category, subcategory, approval_status, published, created_at, updated_at)
        VALUES (${title}, ${titleKo}, ${content}, ${contentKo}, ${enUrl}, ${koUrl}, ${imageUrl}, ${category}, ${subcategory}, 'approved', true, ${pubDate}, NOW())
      `
      if (enUrl) existingUrls.add(enUrl)
      if (koUrl) existingUrls.add(koUrl)
      imported++
    }

    // Debug: show how articles were paired
    const pairDebug = pairs.map(({ en, ko }) => ({
      en: en ? `${extractSection(en.title).vol || '?'}:${extractSection(en.title).section || en.title.slice(0, 40)}` : null,
      ko: ko ? `${extractSection(ko.title).vol || '?'}:${extractSection(ko.title).section || ko.title.slice(0, 40)}` : null,
    }))

    return Response.json({
      success: true,
      imported,
      updated,
      skipped,
      total: pairs.length,
      unpaired: pairs.filter(p => !p.en || !p.ko).length,
      fetched: { en: enItems.length, ko: koItems.length },
      warning,
      pairs: pairDebug,
    })
  } catch (error) {
    console.error('Scrape error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
