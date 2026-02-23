# Social OAuth Runbook (Google / Kakao / Naver)

This project supports **social-only authentication**. Email/password auth is intentionally disabled.

## 1) Required app env

Set all values below in `.env.local` (and deployment env):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_APP_URL=https://<your-app-domain>

NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true
NEXT_PUBLIC_AUTH_KAKAO_ENABLED=true
NEXT_PUBLIC_AUTH_NAVER_ENABLED=true
```

- If a provider toggle is missing/false, the UI disables that provider and shows a user-friendly message.
- If Supabase public env is missing, auth UI fails gracefully (no crash) with an explicit error message.

## 2) Supabase Dashboard setup

1. Go to **Authentication → URL Configuration**
2. Set **Site URL** to your app base URL (same as `NEXT_PUBLIC_APP_URL`)
3. Add **Redirect URLs**:
   - `http://localhost:3000/**` (local)
   - `https://<your-app-domain>/**` (production)
4. Go to **Authentication → Providers** and enable:
   - Google
   - Kakao
   - Naver

## 3) OAuth provider console callback URL

For each provider (Google/Kakao/Naver), use this callback URL in provider console:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

`<project-ref>` is your Supabase project reference.

## 4) Provider-specific checklist

### Google
- Create OAuth client credentials in Google Cloud Console
- Add authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
- Copy client id/secret into Supabase Google provider settings

### Kakao
- Create app in Kakao Developers
- Set Redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
- Add REST API key / secret in Supabase Kakao provider settings

### Naver
- Create app in Naver Developers
- Set callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`
- Add client id/secret in Supabase Naver provider settings

## 5) Smoke check

- `/login` page shows only Google/Kakao/Naver buttons (no email/password form)
- `/register` page shows only Google/Kakao/Naver buttons (no email/password form)
- Disabled providers show clear “temporarily unavailable / setup incomplete” guidance
- Clicking an enabled provider starts Supabase OAuth redirect
