'use client'

// Searchable member picker for admin forms. A plain <select> listed every member
// in signup order, so assigning someone meant scrolling ~240 names. This sorts
// A–Z and filters as you type across English name, Korean name, email and class
// year. Several words narrow together, so "kim 2010" finds Kims of the class of
// 2010.
//
// Keyboard: type to filter, Up/Down to move, Enter to pick, Esc to close. With a
// query typed, the first match is already highlighted, so Enter picks it.

import { useEffect, useMemo, useRef, useState } from 'react'

const collator = new Intl.Collator(['en', 'ko'], { sensitivity: 'base', numeric: true })

export function sortMembers(members) {
  return [...(members || [])].sort((a, b) =>
    collator.compare(a.name || '', b.name || '') ||
    collator.compare(a.name_ko || '', b.name_ko || '') ||
    a.id - b.id)
}

export function memberLabel(m) {
  return `${m.name}${m.name_ko ? ` (${m.name_ko})` : ''} — ${m.graduation_year || '?'}`
}

export function matchesMember(m, query) {
  const terms = String(query || '').toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return true
  const year = m.graduation_year ? String(m.graduation_year) : ''
  const haystack = [m.name, m.name_ko, m.email, year, year && `'${year.slice(-2)}`]
    .filter(Boolean).join(' ').toLowerCase()
  return terms.every(t => haystack.includes(t))
}

export default function MemberPicker({ members, value, onChange, emptyLabel = '— Empty —', className = '', ariaLabel }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const sorted = useMemo(() => sortMembers(members), [members])
  const results = useMemo(() => sorted.filter(m => matchesMember(m, query)), [sorted, query])
  // Index 0 is always the empty choice, so a slot can be cleared from the list.
  const options = useMemo(() => [null, ...results], [results])
  const hasValue = value !== undefined && value !== null && value !== ''
  const selected = hasValue ? (members || []).find(m => String(m.id) === String(value)) : null

  const openPanel = () => {
    setQuery('')
    const idx = hasValue ? sorted.findIndex(m => String(m.id) === String(value)) : -1
    setActive(idx >= 0 ? idx + 1 : 0)
    setOpen(true)
  }

  const choose = (member) => {
    onChange(member ? String(member.id) : '')
    setOpen(false)
  }

  // Close when clicking anywhere outside the picker.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const onQueryChange = (e) => {
    setQuery(e.target.value)
    // Highlight the first real match so Enter picks it straight away.
    setActive(e.target.value.trim() ? 1 : 0)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, options.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (options[active] !== undefined) choose(options[active]) }
    else if (e.key === 'Escape' || e.key === 'Tab') setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`${className} flex items-center justify-between gap-2 text-left cursor-pointer`}
      >
        <span className={`truncate ${selected || hasValue ? '' : 'text-charcoal-light'}`}>
          {selected
            ? memberLabel(selected)
            : hasValue
              // Assigned to someone no longer in the list (e.g. no longer active).
              ? `#${value} — not an active member`
              : emptyLabel}
        </span>
        <svg className="w-4 h-4 shrink-0 text-charcoal-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[18rem] bg-white border border-charcoal/15 rounded-lg shadow-lg">
          <div className="p-2 border-b border-charcoal/10">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={onQueryChange}
              onKeyDown={onKeyDown}
              placeholder="Search name, 한글 이름, email or year…"
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-charcoal/15 focus:outline-none focus:ring-2 focus:ring-burnt-orange/30"
              aria-label="Search members"
            />
            <p className="text-[0.65rem] text-charcoal-light mt-1 px-0.5">
              {results.length} {results.length === 1 ? 'member' : 'members'} · A–Z
            </p>
          </div>
          <ul ref={listRef} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {options.map((m, i) => (
              <li
                key={m ? m.id : 'empty'}
                role="option"
                aria-selected={m ? String(m.id) === String(value) : !hasValue}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(m)}
                className={`px-3 py-1.5 text-sm cursor-pointer ${i === active ? 'bg-burnt-orange/10' : ''} ${
                  m ? 'text-charcoal' : 'text-charcoal-light italic'
                } ${m && String(m.id) === String(value) ? 'font-semibold' : ''}`}
              >
                {m ? memberLabel(m) : emptyLabel}
              </li>
            ))}
            {!results.length && (
              <li className="px-3 py-2 text-sm text-charcoal-light">No members match “{query}”.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
