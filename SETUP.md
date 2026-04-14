# Memoria — Setup Guide

## 1. Supabase Email Template (Beautiful OTP Email)

Go to: **supabase.com → your Memoria project → Authentication → Email Templates**

### For "Magic Link / OTP" template:
- **Subject:** `Your Memoria code 📸`  
- **Body:** Copy the full HTML from `supabase-email-template/otp-email.html` and paste it

Also update these templates with the same HTML body:
- **Confirm signup** → Subject: `Welcome to Memoria! 📸`
- **Change email** → Subject: `Confirm your new Memoria email`

The variable `{{ .Token }}` in the HTML gets replaced automatically by Supabase with the actual OTP code.

---

## 2. Enable Email OTP (not magic link)

In Supabase Dashboard → Authentication → Providers → Email:
- ✅ Enable Email provider
- ✅ **Confirm email** = ON  
- ✅ **Secure email change** = ON
- Set OTP expiry to: **600** (10 minutes)

---

## 3. Admin Access (your number gets auto-admin)

Your phone number `+91 9729741974` is hard-coded as admin in:
- `src/app/auth/page.tsx` — auto-sets `is_admin: true` on profile creation
- Supabase trigger `auto_grant_admin` — also runs server-side on any profile insert/update

**To verify:** Sign in with your number → go to `/admin` — if you see the admin panel, it worked!

---

## 4. Nickname System

Friends' nicknames are stored in **localStorage** (your device only).  
Go to **Settings → Nicknames tab** to set custom names for your contacts.

---

## 5. Environment Variables (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://vkqldmunbiwpczhboxra.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase → Settings → API → anon public key>

# Optional: Cloudflare R2 for media storage (recommended for large files)
CLOUDFLARE_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key  
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=memoria-media
R2_PUBLIC_URL=https://pub-XXXXX.r2.dev
```

Add all of these to **Vercel → Settings → Environment Variables** too.

---

## 6. Push & Deploy

```bash
git add .
git commit -m "feat: email OTP auth, iPhone OTP UI, admin panel, nicknames"
git push
```

Vercel auto-deploys on push.

---

## 7. Files changed in this update

| File | What changed |
|------|-------------|
| `src/app/auth/page.tsx` | Email + phone OTP, iPhone-style OTP boxes, method picker, auto-admin on your number |
| `src/app/settings/page.tsx` | 3-tab settings: Profile / Account (change email+phone) / Nicknames |
| `src/app/admin/page.tsx` | Full admin panel with stats, user list, group management |
| `src/app/dashboard/layout.tsx` | Responsive: desktop sidebar + mobile bottom nav |
| `src/app/globals.css` | Added `animate-shake`, `pb-safe`, `text-memoria-400` utilities |
| `supabase-email-template/otp-email.html` | Paste this into Supabase email template |
| Supabase migration | `auto_grant_admin` trigger + `phone`/`email` columns on profiles |
