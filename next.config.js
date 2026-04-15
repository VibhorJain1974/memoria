/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizeCss: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.cloudflare.com' },
      { protocol: 'https', hostname: '*.backblazeb2.com' },
      { protocol: 'https', hostname: 'pub-*.r2.dev' },
    ],
  },
  compress: true,
  // Allow face-api.js wasm/model loading
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
        { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin-allow-popups' },
      ],
    },
  ],
}

module.exports = nextConfig
