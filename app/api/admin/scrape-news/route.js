import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseStringPromise } from 'xml2js'

const EN_RSS = 'https://www.sxsk.news/tag/english/rss/'
const KO_RSS = 'https://www.sxsk.news/tag/korean/rss/'

function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

async function fetchRss(url) {
  const res = await fetch(url, { next: { revalidate: 0 } })
  const xml = await res.text()
  const parsed = await parseStringPromise(xml, { explicitArray: false })
  const items = parsed.rss.channel.item
  if (!items) return []
  return Array.isArray(items) ? items : [items]
}

// Try to match EN and KO articles by publication date and position in the issue
// Articles from the same issue published at the same time are likely pairs
function matchArticles(enItems, koItems) {
  const matched = []
  const usedKo = new Set()

  for (const en of enItems) {
    const enDate = new Date(en.pubDate).toISOString().slice(0, 10)
    // Try to find a Korean article with same date and similar structure
    // Ghost articles from same issue are published within minutes of each other
    let bestMatch = null
    let bestScore = 0

    for (let i = 0; i < koItems.length; i++) {
      if (usedKo.has(i)) continue
      const ko = koItems[i]
      const koDate = new Date(ko.pubDate).toISOString().slice(0, 10)
      if (koDate !== enDate) continue

      // Score by section tag similarity (e.g., both have "Publisher's Letter" section)
      const enTitle = en.title.toLowerCase()
      const koTitle = ko.title.toLowerCase()

      let score = 1 // Same date
      // Check for volume/section markers
      const enVol = enTitle.match(/vol\.\s*(\d+)/)
      const koVol = koTitle.match(/vol\.\s*(\d+)|제(\d+)호/)
      if (enVol && koVol) {
        const enNum = enVol[1]
        const koNum = koVol[1] || koVol[2]
        if (enNum === koNum) score += 2
      }

      // Check for section markers like [Publisher's Letter] / [발행인의 글]
      const enSection = enTitle.match(/\[([^\]]+)\]/)
      const koSection = koTitle.match(/\[([^\]]+)\]/)
      if (enSection && koSection) {
        // Same section type
        const sectionMap = {
          "publisher's letter": "발행인의 글",
          "utaka news": "utaka 소식",
          "alumni news": "동문 이야기",
          "ut stories": "ut 소식",
          "texas news": "texas 소식",
          "ut interview": "ut 구성원 인터뷰",
          "lifestyle": "라이프스타일",
          "careers": "커리어",
        }
        const enSec = enSection[1].toLowerCase()
        const koSec = koSection[1].toLowerCase()
        if (sectionMap[enSec] === koSec || enSec === koSec) {
          score += 5
        }
      }

      // Time proximity bonus (within 30 minutes)
      const timeDiff = Math.abs(new Date(en.pubDate) - new Date(ko.pubDate))
      if (timeDiff < 30 * 60 * 1000) score += 2

      if (score > bestScore) {
        bestScore = score
        bestMatch = { index: i, item: ko }
      }
    }

    if (bestMatch && bestScore >= 3) {
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

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch both RSS feeds
    const [enItems, koItems] = await Promise.all([
      fetchRss(EN_RSS),
      fetchRss(KO_RSS),
    ])

    // Get existing external URLs to avoid duplicates
    const { rows: existing } = await sql`
      SELECT external_url FROM news WHERE external_url IS NOT NULL
    `
    const existingUrls = new Set(existing.map(r => r.external_url))

    // Match EN/KO pairs
    const pairs = matchArticles(enItems, koItems)

    let imported = 0
    let skipped = 0

    for (const { en, ko } of pairs) {
      const enUrl = en?.link || null
      const koUrl = ko?.link || null

      // Skip if either URL already imported
      if ((enUrl && existingUrls.has(enUrl)) || (koUrl && existingUrls.has(koUrl))) {
        skipped++
        continue
      }

      const title = en ? en.title : (ko ? ko.title : 'Untitled')
      const titleKo = ko ? ko.title : null
      const content = en ? stripHtml(en.description || '') : (ko ? stripHtml(ko.description || '') : '')
      const contentKo = ko ? stripHtml(ko.description || '') : null
      const externalUrl = enUrl || koUrl
      const pubDate = en ? en.pubDate : ko.pubDate
      const author = en?.['dc:creator'] || ko?.['dc:creator'] || 'SXSK'

      await sql`
        INSERT INTO news (title, title_ko, content, content_ko, external_url, category, approval_status, published, created_at, updated_at)
        VALUES (${title}, ${titleKo}, ${content}, ${contentKo}, ${externalUrl}, 'news', 'approved', true, ${new Date(pubDate).toISOString()}, NOW())
      `
      imported++
    }

    return Response.json({
      success: true,
      imported,
      skipped,
      total: pairs.length,
    })
  } catch (error) {
    console.error('Scrape error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
