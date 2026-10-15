// Turns an og:image value into an absolute URL. Sites may give a relative path
// ("/media/cover.jpg"), and stored as-is that resolves against our own domain,
// so the browser asks utkorea.org for an image that lives on the original site.
// Returns null for anything that is not http(s) once resolved.
export function resolveImageUrl(value, pageUrl) {
  if (!value) return null
  try {
    const url = new URL(value.trim(), pageUrl)
    return /^https?:$/.test(url.protocol) ? url.href : null
  } catch {
    return null
  }
}
