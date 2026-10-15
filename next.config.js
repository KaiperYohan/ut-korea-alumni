/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Hosts Vercel may resize news thumbnails from. Kept to known sources: an
    // open pattern would let anyone use the site as an image proxy and spend the
    // optimization quota. Must match OPTIMIZABLE_HOSTS in app/components/NewsThumb.js;
    // images from any other host are shown as-is.
    remotePatterns: [
      { protocol: 'https', hostname: '**.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'www.sxsk.news' },
    ],
    formats: ['image/webp'],
    // Thumbnails never change once stored, so cache resized copies for a month
    // rather than re-transforming them, which is what counts against the quota.
    minimumCacheTTL: 60 * 60 * 24 * 31,
  },
}

module.exports = nextConfig
