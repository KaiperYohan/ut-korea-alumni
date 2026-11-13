'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

// Today's promotions for this visitor, shared by the pop-up and the top bar so
// the page asks once. Fetched again when the visitor logs in or out, since who a
// promotion is for can depend on it.
let cache = { key: null, promise: null }

function load(key) {
  if (cache.key !== key) {
    cache = {
      key,
      promise: fetch('/api/promotions', { cache: 'no-store' })
        .then(r => (r.ok ? r.json() : { promotions: [] }))
        .then(d => d.promotions || [])
        .catch(() => []),
    }
  }
  return cache.promise
}

export default function usePromotions() {
  const { data: session, status } = useSession()
  const [promotions, setPromotions] = useState([])
  const key = status === 'loading' ? null : (session?.user?.id || 'guest')

  useEffect(() => {
    if (!key) return
    let cancelled = false
    load(key).then(list => { if (!cancelled) setPromotions(list) })
    return () => { cancelled = true }
  }, [key])

  return promotions
}

// Where a promotion's button goes: its own link if one is set, else its page.
export const promoHref = p => p.button_url || `/promo/${p.slug}`
