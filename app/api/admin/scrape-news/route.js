import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseStringPromise } from 'xml2js'

const SITEMAP_URL = 'https://www.sxsk.news/sitemap-posts.xml'
const SITE_BASE = 'https://www.sxsk.news'

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
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

// Fetch all post URLs from the sitemap
async function fetchSitemapUrls() {
  const res = await fetch(SITEMAP_URL, { next: { revalidate: 0 } })
  const xml = await res.text()
  const parsed = await parseStringPromise(xml, { explicitArray: false })
  const urls = parsed.urlset.url
  if (!urls) return []
  const items = Array.isArray(urls) ? urls : [urls]
  return items.map(u => ({
    url: u.loc,
    lastmod: u.lastmod || null,
  }))
}

// Extract og:title, og:description, and article content from a page
async function fetchPageMeta(url) {
  const res = await fetch(url, { next: { revalidate: 0 } })
  const html = await res.text()

  const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/) ||
    html.match(/<meta\s+content="([^"]*)"\s+property="og:title"/)
  const ogDesc = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/) ||
    html.match(/<meta\s+content="([^"]*)"\s+property="og:description"/)
  const ogDate = html.match(/<meta\s+property="article:published_time"\s+content="([^"]*)"/) ||
    html.match(/<meta\s+content="([^"]*)"\s+property="article:published_time"/)

  const title = ogTitle ? decodeEntities(ogTitle[1]) : ''
  const description = ogDesc ? decodeEntities(ogDesc[1]) : ''
  const pubDate = ogDate ? ogDate[1] : null

  return { title, description, pubDate, url }
}

// Detect Korean by checking for Hangul characters in title
function isKoreanTitle(title) {
  // Hangul Unicode range: \uAC00-\uD7AF (syllables), \u3130-\u318F (jamo)
  return /[\uAC00-\uD7AF\u3130-\u318F]/.test(title)
}

// Extract volume and section from title for matching
function extractSection(title) {
  const volMatch = title.match(/vol\.\s*(\d+)/i) || title.match(/제(\d+)호/)
  const vol = volMatch ? (volMatch[1] || volMatch[2]) : null

  const sectionMatch = title.match(/\[([^\]]+)\]/)
  const section = sectionMatch ? sectionMatch[1].toLowerCase() : null

  // Check for cover/index pages (e.g. "SXSK Vol. 3 — March 15, 2026")
  const isCover = /^sxsk\s+(vol\.|제)/i.test(title)

  return { vol, section, isCover }
}

// Section mapping for EN/KO matching
const SECTION_MAP = {
  "publisher's letter": "발행인의 글",
  "utaka news": "utaka 소식",
  "alumni news": "동문 이야기",
  "ut stories": "ut 소식",
  "texas news": "texas 소식",
  "ut member interview": "ut 구성원 인터뷰",
  "ut interview": "ut 구성원 인터뷰",
  "lifestyle": "라이프스타일",
  "careers": "커리어",
  "call for submittals": "제보 받습니다",
  "job posting": "채용공고",
}

function matchArticles(enItems, koItems) {
  const matched = []
  const usedKo = new Set()

  for (const en of enItems) {
    const enInfo = extractSection(en.title)
    let bestMatch = null
    let bestScore = 0

    for (let i = 0; i < koItems.length; i++) {
      if (usedKo.has(i)) continue
      const ko = koItems[i]
      const koInfo = extractSection(ko.title)

      let score = 0

      // Same volume
      if (enInfo.vol && koInfo.vol && enInfo.vol === koInfo.vol) score += 3

      // Both are cover pages of same volume
      if (enInfo.isCover && koInfo.isCover && enInfo.vol === koInfo.vol) {
        score += 10
      }

      // Section matching
      if (enInfo.section && koInfo.section) {
        const mappedKo = SECTION_MAP[enInfo.section]
        if (mappedKo === koInfo.section || enInfo.section === koInfo.section) {
          score += 5
        }
      }

      // Date proximity
      if (en.pubDate && ko.pubDate) {
        const enDate = new Date(en.pubDate).toISOString().slice(0, 10)
        const koDate = new Date(ko.pubDate).toISOString().slice(0, 10)
        if (enDate === koDate) score += 2
      }

      if (score > bestScore) {
        bestScore = score
        bestMatch = { index: i, item: ko }
      }
    }

    if (bestMatch && bestScore >= 5) {
      usedKo.add(bestMatch.index)
      matched.push({ en, ko: bestMatch.item })
    } else {
      matched.push({ en, ko: null })
    }
  }

  // Add unmatched Korean articles
  for (let i = 0; i < koItems.length; i++) {
    if (!usedKo.has(i)) {
      matched.push({ en: null, ko: koItems[i] })
    }
  }

  return matched
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { rows } = await sql`
      DELETE FROM news WHERE external_url IS NOT NULL AND external_url LIKE 'https://www.sxsk.news%'
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
    // Fetch all post URLs from sitemap
    const sitemapUrls = await fetchSitemapUrls()

    // Fetch page metadata for all posts (in batches of 5)
    const allItems = []
    for (let i = 0; i < sitemapUrls.length; i += 5) {
      const batch = sitemapUrls.slice(i, i + 5)
      const batchResults = await Promise.all(
        batch.map(u => fetchPageMeta(u.url).catch(() => null))
      )
      allItems.push(...batchResults.filter(Boolean))
    }

    // Separate EN and KO by detecting Hangul in the title
    const enItems = []
    const koItems = []
    for (const item of allItems) {
      if (isKoreanTitle(item.title)) {
        koItems.push(item)
      } else {
        enItems.push(item)
      }
    }

    // Get existing external URLs to avoid duplicates
    const { rows: existing } = await sql`
      SELECT external_url, external_url_ko FROM news WHERE external_url IS NOT NULL
    `
    const existingUrls = new Set()
    for (const r of existing) {
      if (r.external_url) existingUrls.add(r.external_url)
      if (r.external_url_ko) existingUrls.add(r.external_url_ko)
    }

    // Match EN/KO pairs
    const pairs = matchArticles(enItems, koItems)

    let imported = 0
    let skipped = 0
    let updated = 0

    for (const { en, ko } of pairs) {
      const enUrl = en?.url || null
      const koUrl = ko?.url || null

      // Skip if already exists
      if ((enUrl && existingUrls.has(enUrl)) || (koUrl && existingUrls.has(koUrl))) {
        if (enUrl && koUrl && existingUrls.has(enUrl)) {
          await sql`
            UPDATE news SET external_url_ko = ${koUrl}
            WHERE external_url = ${enUrl} AND (external_url_ko IS NULL OR external_url_ko = '')
          `
          updated++
        }
        skipped++
        continue
      }

      const title = en ? en.title : (ko ? ko.title : '')
      const titleKo = ko ? ko.title : null
      const content = en ? stripHtml(en.description || '') : (ko ? stripHtml(ko.description || '') : '')
      const contentKo = ko ? stripHtml(ko.description || '') : null
      const externalUrl = enUrl
      const externalUrlKo = koUrl
      const pubDate = en?.pubDate || ko?.pubDate || new Date().toISOString()

      // Categorize based on title section
      const refTitle = (en?.title || ko?.title || '').toLowerCase()
      let category = 'sxsk'
      let subcategory = null
      if (/\[utaka\s*news\]|\[utaka\s*소식\]/.test(refTitle)) {
        category = 'utaka_news'
      } else if (/\[ut\s*member\s*interview\]|\[ut\s*구성원\s*인터뷰\]/.test(refTitle)) {
        category = 'members_news'
        subcategory = 'interview'
      }

      await sql`
        INSERT INTO news (title, title_ko, content, content_ko, external_url, external_url_ko, category, subcategory, approval_status, published, created_at, updated_at)
        VALUES (${title}, ${titleKo}, ${content}, ${contentKo}, ${externalUrl}, ${externalUrlKo}, ${category}, ${subcategory}, 'approved', true, ${new Date(pubDate).toISOString()}, NOW())
      `
      if (enUrl) existingUrls.add(enUrl)
      if (koUrl) existingUrls.add(koUrl)
      imported++
    }

    return Response.json({
      success: true,
      imported,
      updated,
      skipped,
      total: pairs.length,
      fetched: { en: enItems.length, ko: koItems.length },
    })
  } catch (error) {
    console.error('Scrape error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
