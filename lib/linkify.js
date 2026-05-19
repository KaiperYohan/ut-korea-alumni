import React from 'react'

// Convert URL-like substrings in plain text into clickable anchor elements.
// Returns an array of strings and <a> elements suitable for rendering as
// children inside an element with `whitespace-pre-wrap` (newlines preserved).
export function linkify(text) {
  if (!text) return text
  const urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/g
  const trailingPunct = /[.,;:!?)\]}>'"]+$/
  const parts = []
  let lastIndex = 0
  let match
  let key = 0
  while ((match = urlRegex.exec(text)) !== null) {
    let url = match[0]
    let trailing = ''
    const punctMatch = url.match(trailingPunct)
    if (punctMatch) {
      trailing = punctMatch[0]
      url = url.slice(0, -trailing.length)
    }
    if (!url) {
      lastIndex = match.index + match[0].length
      continue
    }
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    const href = url.startsWith('www.') ? `http://${url}` : url
    parts.push(
      React.createElement(
        'a',
        {
          key: key++,
          href,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'text-burnt-orange hover:underline break-all',
        },
        url
      )
    )
    if (trailing) parts.push(trailing)
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length > 0 ? parts : text
}
