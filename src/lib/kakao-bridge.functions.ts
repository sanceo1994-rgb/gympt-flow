import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type KakaoMeResponse = {
  id: number | string;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
};

// Bridges a Kakao access_token (obtained via the Kakao JS SDK — desktop app
// handoff or mobile app switch) into a real Supabase session. Supabase has no
// built-in Kakao id_token support, so we verify the token against Kakao's own
// API, upsert the matching auth user, and hand back a magic-link token_hash
// that the client exchanges via supabase.auth.verifyOtp without ever showing
// a password field.
export const kakaoBridgeLogin = createServerFn({ method: "POST" })
  .validator(z.object({ accessToken: z.string().min(1) }).parse)
  .handler(async ({ data }) => {
    const { accessToken } = data;

    const meRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!meRes.ok) {
      throw new Error("카카오 토큰 검증에 실패했습니다.");
    }
    const me = (await meRes.json()) as KakaoMeResponse;

    const kakaoId = String(me.id);
    const account = me.kakao_account ?? {};
    const profile = account.profile ?? {};
    const name = profile.nickname ?? "";
    const avatar = profile.profile_image_url ?? "";
    const email = account.email ?? `kakao_${kakaoId}@users.gympt.app`;

    const metadata = {
      name,
      full_name: name,
      nickname: name,
      avatar_url: avatar || null,
      picture: avatar || null,
      kakao_id: kakaoId,
      provider: "kakao",
    };

    // generateLink with type "magiclink" creates the auth user automatically
    // when the email doesn't exist yet (and applies options.data as its
    // initial user_metadata), so no separate createUser/lookup step is needed.
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { data: metadata },
    });
    if (linkError || !linkData) {
      throw new Error(linkError?.message ?? "로그인 링크 생성에 실패했습니다.");
    }

    // For users who already existed, refresh their metadata with the latest
    // Kakao profile (generateLink only applies options.data on first create).
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(linkData.user.id, {
      user_metadata: metadata,
    });
    if (updateError) throw new Error(updateError.message);

    return {
      email,
      tokenHash: linkData.properties.hashed_token,
    };
  });
