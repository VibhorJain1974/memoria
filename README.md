# Memoria 📸

> **The photo-sharing app your friend group actually deserves.**

A privacy-first, full-resolution collaborative photo and memory platform — built as a production SaaS alternative to WhatsApp groups and Google Photos. No compression. No ads. No algorithm.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Full Quality, Always** | No WhatsApp compression. Ever. Your 108MP shots stay 108MP, stored on Cloudflare R2. |
| **Live Photos, Alive** | iPhone Live Photos play as they should — not frozen stills. |
| **Slide to Select** | Run your finger across the grid. Select 50 pics in 2 seconds. |
| **Face Search** | Find every photo of a specific person across all albums instantly. |
| **Selective Sharing** | Drama in the group? One tap to hide specific pics from specific people. |
| **Monthly Flashbacks** | Auto-generated collages of your best moments every month. |
| **Duplicate Detection** | Everyone uploads the same pic? Caught automatically — album stays clean. |
| **Vibe Tags** | Tag albums with "chaotic", "core memory", "slay" — the way you actually talk. |
| **Role-based Access** | Admin / Member / Viewer roles per group with invite-code system. |

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Radix UI** — accessible component primitives
- **Framer Motion** — smooth animations and page transitions
- **Lucide React** — icon system
- **react-dropzone** — drag-and-drop media uploads

### Backend & Auth
- **Supabase** — PostgreSQL database, SSR authentication (`@supabase/ssr`), and fallback media storage
- **Supabase Auth** — email/password + OAuth flows via server-side rendering

### Storage
- **Cloudflare R2** — primary object storage for all media (S3-compatible, via `@aws-sdk/client-s3` + presigned URLs)
- **AWS S3 Presigner** — presigned URL generation for secure direct-to-R2 uploads
- **sharp** — server-side image processing and thumbnail generation

### Deployment & Analytics
- **Vercel** — hosting and edge deployment
- **Vercel Analytics** — real-time usage tracking

---

## 📁 Project Structure

```
memoria/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page (Framer Motion animations)
│   │   ├── (auth)/               # Login, signup, password reset
│   │   ├── (dashboard)/          # Main app routes
│   │   │   ├── groups/           # Group browsing and creation
│   │   │   ├── groups/[id]/      # Group detail, media grid, members
│   │   │   └── profile/          # User profile, settings
│   │   └── api/
│   │       ├── upload/           # R2 presigned URL generation
│   │       ├── memories/         # CRUD for media items
│   │       └── groups/           # Group management endpoints
│   ├── lib/
│   │   └── supabase.ts           # Supabase client + R2/Supabase URL resolver
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces (Profile, Group, GroupMember, MediaType)
│   └── components/               # Reusable UI components
├── public/                       # Static assets
├── package.json
├── tailwind.config.ts
└── next.config.ts
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Supabase project
- Cloudflare R2 bucket

### Environment Variables

Create a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cloudflare R2
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=memoria-media
R2_PUBLIC_URL=https://your-r2-public-domain.com
```

### Installation

```bash
git clone https://github.com/VibhorJain1974/Memoria.git
cd Memoria
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🗄️ Database Schema (Supabase)

Key tables:

```sql
-- User profiles
profiles (id, username, display_name, avatar_url, avatar_emoji, bio, is_admin, vibe_color)

-- Groups / albums
groups (id, name, description, cover_url, cover_gradient, invite_code, invite_emoji, created_by, is_private)

-- Group membership with roles
group_members (id, group_id, user_id, role: 'admin'|'member'|'viewer', nickname, joined_at)

-- Media items
media (id, group_id, uploaded_by, url, thumbnail_url, media_type: 'photo'|'video'|'live_photo'|'boomerang', ...)
```

---

## 📦 Media Storage Architecture

```
Upload flow:
Client → POST /api/upload → generates R2 presigned URL → Client uploads directly to R2
                                                        → saves metadata to Supabase DB

Serve flow:
Client → getMediaUrl(path) → if R2 URL: serve directly from CDN
                           → if legacy path: serve via Supabase Storage transform API
```

This approach keeps Supabase costs low while leveraging Cloudflare's global CDN for fast media delivery.

---

## 🛣️ Roadmap

- [ ] Face search (on-device ML via TF.js)
- [ ] Monthly flashback auto-generation
- [ ] Duplicate detection (perceptual hashing)
- [ ] Selective per-person visibility
- [ ] Live Photo playback (HEIC/HEVC support)
- [ ] Native mobile app (React Native)
- [ ] Paid tiers with storage quotas

---

## 📄 License

MIT — free to use, modify, and deploy.

---

Built by [Vibbhor Jain](https://github.com/VibhorJain1974)
