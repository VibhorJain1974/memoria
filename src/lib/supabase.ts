import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * storage_path is now a full R2 URL (https://pub-xxx.r2.dev/...)
 * Fall back to Supabase URL for any old data
 */
export function getMediaUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path   // Already a full R2 URL
  // Legacy Supabase path
  const supabase = createClient()
  const { data } = supabase.storage.from('memoria-media').getPublicUrl(path)
  return data.publicUrl
}

export function getThumbnailUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path   // R2 — serve directly
  // Legacy Supabase path with transform
  const supabase = createClient()
  const { data } = supabase.storage.from('memoria-media').getPublicUrl(path, {
    transform: { width: 400, height: 400, resize: 'cover' }
  })
  return data.publicUrl
}
