# Kakao Login Setup

PickGymPT uses Kakao OAuth through Supabase Auth. Never commit the Kakao REST API key or client secret to Git.

## 1. Kakao Developers

1. Create an application in Kakao Developers.
2. Enable Kakao Login.
3. Add this Kakao Login redirect URI:

   `https://symnrjcgtltcgizwbaax.supabase.co/auth/v1/callback`

4. Configure consent items for nickname and profile image.
5. Configure account email if the Kakao app is eligible. Users can enter an email during PickGymPT onboarding when Kakao does not provide one.
6. Create and activate the Kakao Login client secret.

The Kakao REST API key is the Supabase `client_id`. The Kakao Login client secret is the Supabase `client_secret`.

## 2. Supabase Dashboard

1. Open Authentication > Providers > Kakao.
2. Enable Kakao.
3. Enter the Kakao REST API key and Kakao Login client secret.
4. Open Authentication > URL Configuration.
5. Allow the application callback URLs:

   - `http://localhost:4173/auth/callback`
   - `https://<production-domain>/auth/callback`

Use the actual local port and production domain when they differ.

## 3. Application Flow

1. `/login` starts OAuth with `signInWithOAuth({ provider: "kakao" })`.
2. Kakao returns to Supabase Auth.
3. Supabase returns to `/auth/callback` with a PKCE code.
4. Existing members go directly to `/profile`.
5. New members continue through terms, role selection, and profile completion.

## Security

- Keep provider credentials only in Kakao Developers and Supabase Dashboard.
- Do not add Kakao secrets to `.env`, Vercel client variables, or GitHub.
- Only the application callback URLs should be added to the Supabase redirect allowlist.
