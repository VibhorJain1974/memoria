export type MediaType = 'photo' | 'video' | 'live_photo' | 'boomerang'
export type MemberRole = 'admin' | 'member' | 'viewer'

export interface Profile {
  id: string
  username: string
  display_name?: string
  avatar_url?: string
  avatar_emoji: string
  bio?: string
  is_admin: boolean
  vibe_color: string
  created_at: string
  updated_at: string
}

export interface Group {
  id: string
  name: string
  description?: string
  cover_url?: string
  cover_gradient: string
  invite_code: string
  invite_emoji: string
  created_by?: string
  is_private: boolean
  created_at: string
  member_count?: number
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: MemberRole
  nickname?: string
  joined_at: string
  profile?: Profile
}

export interface Album {
  id: string
  group_id: string
  name: string
  description?: string
  cover_url?: string
  emoji: string
  event_date?: string
  location?: string
  location_lat?: number
  location_lng?: number
  created_by?: string
  total_memories: number
  created_at: string
  vibe_tags?: Vibe[]
  uploader?: Profile
}

export interface Media {
  id: string
  album_id: string
  group_id: string
  uploaded_by?: string
  storage_path: string
  live_photo_path?: string
  thumbnail_path?: string
  media_type: MediaType
  mime_type?: string
  file_size_bytes?: number
  original_filename?: string
  width?: number
  height?: number
  duration_seconds?: number
  taken_at?: string
  device_model?: string
  caption?: string
  location?: string
  phash?: string
  is_duplicate: boolean
  is_favorite: boolean
  face_data: FaceData[]
  created_at: string
  uploader?: Profile
  reactions?: Reaction[]
  reaction_counts?: Record<string, number>
  comments_count?: number
}

export interface Reaction {
  id: string
  media_id: string
  user_id: string
  emoji: string
  created_at: string
  profile?: Profile
}

export interface Comment {
  id: string
  media_id: string
  user_id: string
  content: string
  parent_id?: string
  created_at: string
  profile?: Profile
  replies?: Comment[]
}

export interface SharingBlock {
  id: string
  blocker_id: string
  blocked_user_id: string
  album_id?: string
  media_id?: string
  group_id?: string
  created_at: string
}

export interface Flashback {
  id: string
  group_id: string
  user_id: string
  title?: string
  media_ids: string[]
  collage_url?: string
  period_month: number
  period_year: number
  is_seen: boolean
  created_at: string
}

export interface Vibe {
  id: string
  album_id: string
  tag: string
  color?: string
  created_by?: string
  created_at: string
}

export interface FacePerson {
  id: string
  group_id: string
  label?: string
  linked_user_id?: string
  created_at: string
  profile?: Profile
}

export interface FaceData {
  bbox: [number, number, number, number]
  confidence: number
  person_id?: string
}

export interface UploadFile {
  file: File
  preview: string
  isLivePhoto: boolean
  livePhotoVideo?: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
  mediaId?: string
}

export const REACTION_EMOJIS = ['❤️', '😂', '😍', '🔥', '✨', '😭', '🥹', '💀', '🫶', '🎉']

export const VIBE_TAGS = [
  { tag: 'chaotic', color: '#f472b6', emoji: '🌪️' },
  { tag: 'aesthetic', color: '#818cf8', emoji: '✨' },
  { tag: 'bestie hours', color: '#34d399', emoji: '🫂' },
  { tag: 'slay', color: '#fbbf24', emoji: '💅' },
  { tag: 'unhinged', color: '#fb7185', emoji: '💀' },
  { tag: 'core memory', color: '#22d3ee', emoji: '🧠' },
  { tag: 'lowkey elite', color: '#a78bfa', emoji: '👑' },
  { tag: 'crying rn', color: '#60a5fa', emoji: '😭' },
]

export const GROUP_GRADIENTS = [
  'linear-gradient(135deg, #6558f5, #ec4899)',
  'linear-gradient(135deg, #22d3ee, #6558f5)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #10b981, #22d3ee)',
  'linear-gradient(135deg, #f472b6, #fb923c)',
  'linear-gradient(135deg, #818cf8, #34d399)',
  'linear-gradient(135deg, #c084fc, #f472b6)',
  'linear-gradient(135deg, #2dd4bf, #818cf8)',
]
