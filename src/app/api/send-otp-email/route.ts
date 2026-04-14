// This is the HTML template you paste into:
// Supabase Dashboard → Authentication → Email Templates → "Magic Link" or "OTP"
// 
// Replace the default template with the HTML below.
// Variables available: {{ .Token }} (OTP code), {{ .Email }}, {{ .SiteURL }}

export const MEMORIA_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Memoria code</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a0f; font-family: 'Space Grotesk', -apple-system, sans-serif; color: #fff; }
    .wrapper { max-width: 520px; margin: 0 auto; padding: 40px 20px; }
    .card { background: linear-gradient(135deg, rgba(101,88,245,0.08), rgba(236,72,153,0.06)); border: 1px solid rgba(255,255,255,0.08); border-radius: 28px; padding: 44px 40px; text-align: center; }
    .logo { font-size: 48px; margin-bottom: 8px; }
    .brand { font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #6558f5, #ec4899, #22d3ee); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 6px; }
    .tagline { color: rgba(255,255,255,0.35); font-size: 13px; margin-bottom: 36px; }
    .greeting { font-size: 18px; color: rgba(255,255,255,0.7); margin-bottom: 8px; }
    .desc { font-size: 14px; color: rgba(255,255,255,0.35); margin-bottom: 32px; line-height: 1.6; }
    .otp-wrapper { display: flex; gap: 8px; justify-content: center; margin-bottom: 32px; }
    .otp-box { width: 52px; height: 60px; border-radius: 14px; background: rgba(101,88,245,0.18); border: 2px solid rgba(101,88,245,0.5); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; color: #fff; box-shadow: 0 0 20px rgba(101,88,245,0.25); }
    .otp-full { font-size: 36px; font-weight: 700; letter-spacing: 10px; background: linear-gradient(135deg, #6558f5, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 32px; }
    .expiry { background: rgba(255,255,255,0.04); border-radius: 12px; padding: 12px 20px; color: rgba(255,255,255,0.4); font-size: 12px; margin-bottom: 28px; }
    .expiry strong { color: rgba(255,255,255,0.65); }
    .footer { margin-top: 28px; color: rgba(255,255,255,0.2); font-size: 11px; line-height: 1.7; }
    .footer a { color: rgba(101,88,245,0.6); text-decoration: none; }
    .divider { height: 1px; background: rgba(255,255,255,0.06); margin: 24px 0; }
    .emojis { font-size: 22px; letter-spacing: 4px; margin-bottom: 20px; opacity: 0.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="logo">📸</div>
      <div class="brand">Memoria</div>
      <div class="tagline">Your memories, together. Forever.</div>

      <div class="emojis">✨ 🎉 📷</div>

      <div class="greeting">Hey there! 👋</div>
      <div class="desc">
        Here&apos;s your one-time code to sign in to Memoria.<br/>
        It expires in <strong>10 minutes</strong>.
      </div>

      <div class="otp-full">{{ .Token }}</div>

      <div class="expiry">
        <strong>⏱ Expires in 10 minutes</strong> — don&apos;t share this with anyone
      </div>

      <div class="divider"></div>

      <div class="footer">
        If you didn&apos;t request this, just ignore this email — your account is safe.<br/>
        Questions? Reach the Memoria team.<br/><br/>
        Made with 💜 for friend groups everywhere
      </div>
    </div>
  </div>
</body>
</html>
`

// Instructions for setting up in Supabase:
// 1. Go to supabase.com → your Memoria project
// 2. Authentication → Email Templates
// 3. Select "Magic Link" template
// 4. Replace Subject with: Your Memoria code 📸
// 5. Replace Body with the HTML in MEMORIA_EMAIL_TEMPLATE above
// 6. Save
//
// For OTP specifically (not magic link), also update:
// Authentication → Email Templates → "Confirm signup" and "Change Email"
// Use the same template but the variable is {{ .Token }} for OTP

export async function GET() {
  return new Response(MEMORIA_EMAIL_TEMPLATE, {
    headers: { 'Content-Type': 'text/html' }
  })
}
