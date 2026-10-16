'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

// Event images are uploaded in any shape — a concert poster is portrait A4 —
// but shown in wide, short slots, so filling the slot crops the top and bottom
// off. On hover the whole image is shown instead, over a blurred copy of itself
// so the slot does not turn to empty bars. Tailwind only applies hover on
// devices that can hover, so a tap on a phone does not leave it stuck; phones get
// the whole image by tapping, through `onOpen` and ImageLightbox below.
export default function EventImage({ src, alt = '', className = '', onOpen, openLabel }) {
  if (!src) return null
  const interactive = typeof onOpen === 'function'
  return (
    <div
      className={`group/img relative overflow-hidden bg-charcoal ${interactive ? 'cursor-zoom-in' : ''} ${className}`}
      onClick={interactive ? onOpen : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } } : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? (openLabel || 'View full image') : undefined}
    >
      <img src={src} alt="" aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-0 transition-opacity duration-300 group-hover/img:opacity-70" />
      <img src={src} alt={alt}
        className="relative w-full h-full object-cover group-hover/img:object-contain" />
      {interactive && (
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[0.7rem] font-semibold text-white backdrop-blur-sm pointer-events-none">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
          </svg>
          {openLabel || 'View full image'}
        </span>
      )}
    </div>
  )
}

// Full-screen viewer showing images uncropped. Esc or a click outside the image
// closes it; arrow keys and the side buttons move between several images.
// Rendered into <body>: the event card's styling would otherwise trap a fixed
// overlay inside the card instead of covering the screen.
export function ImageLightbox({ images, index, onIndex, onClose, closeLabel = 'Close' }) {
  const open = index !== null && index !== undefined && images?.length
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' && images.length > 1) onIndex((index + 1) % images.length)
      else if (e.key === 'ArrowLeft' && images.length > 1) onIndex((index - 1 + images.length) % images.length)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow }
  }, [open, index, images, onIndex, onClose])

  if (!open) return null
  const many = images.length > 1
  const step = (d) => (e) => { e.stopPropagation(); onIndex((index + d + images.length) % images.length) }
  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <img src={images[index]} alt="" className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl" onClick={(e) => e.stopPropagation()} />
      <button onClick={onClose} aria-label={closeLabel}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white text-2xl leading-none border-none cursor-pointer hover:bg-white/25">&times;</button>
      {many && (
        <>
          <button onClick={step(-1)} aria-label="Previous image"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 text-white border-none cursor-pointer hover:bg-white/25">‹</button>
          <button onClick={step(1)} aria-label="Next image"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 text-white border-none cursor-pointer hover:bg-white/25">›</button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">{index + 1} / {images.length}</span>
        </>
      )}
    </div>,
    document.body,
  )
}
