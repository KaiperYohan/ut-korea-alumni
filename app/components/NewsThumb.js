'use client'

import { useState } from 'react'
import Image from 'next/image'

// Thumbnail for a news card. Fills its parent (which must be positioned).
//
// Images from known hosts go through Vercel's image optimizer, which serves each
// device a WebP sized to the slot, so a phone never downloads more than the card
// can show. Anything else is shown directly, lazily. The host list must match
// images.remotePatterns in next.config.js — an unlisted host passed to next/image
// is an error rather than a fallback.
const OPTIMIZABLE_HOSTS = [/\.public\.blob\.vercel-storage\.com$/, /^www\.sxsk\.news$/]

function optimizable(src) {
  try {
    const url = new URL(src)
    return url.protocol === 'https:' && OPTIMIZABLE_HOSTS.some(re => re.test(url.hostname))
  } catch {
    return false
  }
}

export default function NewsThumb({ src, alt = '', sizes = '(min-width: 768px) 400px, 100vw', className = '' }) {
  // A dead link (expired invitation cards, removed posts) renders nothing, so the
  // card shows its normal placeholder instead of a broken-image icon.
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null
  const cls = `absolute inset-0 w-full h-full object-cover ${className}`
  if (optimizable(src)) {
    return <Image src={src} alt={alt} fill sizes={sizes} className={cls} onError={() => setFailed(true)} />
  }
  return <img src={src} alt={alt} loading="lazy" decoding="async" className={cls} onError={() => setFailed(true)} />
}
