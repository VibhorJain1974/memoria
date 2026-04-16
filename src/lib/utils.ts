import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isThisYear } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (isThisYear(date)) return format(date, 'MMM d')
  return format(date, 'MMM d, yyyy')
}

export function formatRelative(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function isLivePhoto(file: File): boolean {
  return file.type === 'image/heic' ||
    (file.name.toLowerCase().endsWith('.jpg') && file.size > 3 * 1024 * 1024)
}

export function isVideo(file: File): boolean { return file.type.startsWith('video/') }
export function isImage(file: File): boolean { return file.type.startsWith('image/') }

export async function computeSimpleHash(file: File): Promise<string> {
  // SHA-256 of first 4KB + file size — better duplicate detection, consistent format
  const buffer = await file.slice(0, 4096).arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.substring(0, 16)}_${file.size}`
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
}

export function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export const AURORA_COLORS = [
  '#6558f5', '#ec4899', '#22d3ee', '#fbbf24', '#34d399',
  '#f472b6', '#818cf8', '#2dd4bf', '#fb7185', '#a78bfa'
]

export function getAvatarColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AURORA_COLORS[Math.abs(hash) % AURORA_COLORS.length]
}
