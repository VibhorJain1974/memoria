import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/** Works with both R2 full URLs and legacy Supabase paths */
export function getMediaUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const sb = createClient()
  const { data } = sb.storage.from('memoria-media').getPublicUrl(path)
  return data.publicUrl
}

export function getThumbnailUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path  // R2 — serve directly, fast CDN
  const sb = createClient()
  const { data } = sb.storage.from('memoria-media').getPublicUrl(path, {
    transform: { width: 400, height: 400, resize: 'cover' }
  })
  return data.publicUrl
}
