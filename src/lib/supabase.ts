import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function getMediaUrl(path: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from('memoria-media').getPublicUrl(path)
  return data.publicUrl
}

export function getThumbnailUrl(path: string): string {
  if (!path) return ''
  const supabase = createClient()
  const { data } = supabase.storage.from('memoria-media').getPublicUrl(path, {
    transform: { width: 400, height: 400, resize: 'cover' }
  })
  return data.publicUrl
}
