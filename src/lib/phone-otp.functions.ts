import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomInt, createHash } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const RESEND_COOLDOWN_MS = 60_000;
const CODE_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
const RECENT_VERIFY_WINDOW_MS = 10 * 60_000;

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

type PhoneOtpRow = {
  id: string;
  code_hash: string;
  attempts: number;
  consumed_at: string | null;
  expires_at: string;
  created_at: string;
};

// Sends a 6-digit code via Aligo SMS and stores its hash for verifyPhoneOtp
// to check against. The actual code never touches the database in plaintext.
export const requestPhoneOtp = createServerFn({ method: "POST" })
  .validator(z.object({ phone: z.string().min(1) }).parse)
  .handler(async ({ data }) => {
    const apiKey = process.env.ALIGO_API_KEY;
    const userId = process.env.ALIGO_USER_ID;
    const sender = process.env.ALIGO_SENDER;
    if (!apiKey || !userId || !sender) {
      throw new Error("SMS 발송 설정이 누락되었습니다.");
    }

    const phone = normalizePhone(data.phone);
    if (phone.length !== 11) throw new Error("올바른 휴대폰 번호를 입력해주세요.");

    const { data: recent } = await supabaseAdmin
      .from("phone_otps" as never)
      .select("created_at")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const recentRow = recent as { created_at: string } | null;
    if (recentRow && Date.now() - new Date(recentRow.created_at).getTime() < RESEND_COOLDOWN_MS) {
      throw new Error("잠시 후 다시 시도해주세요. 인증번호는 60초마다 1번 발송할 수 있어요.");
    }

    const code = String(randomInt(100000, 1000000));
    const { error: insertError } = await supabaseAdmin.from("phone_otps" as never).insert({
      phone,
      code_hash: hashCode(code),
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    } as never);
    if (insertError) throw new Error("인증번호 생성에 실패했습니다.");

    const body = new URLSearchParams({
      key: apiKey,
      user_id: userId,
      sender,
      receiver: phone,
      msg: `[픽짐피티] 인증번호는 ${code} 입니다.`,
      msg_type: "SMS",
    });
    const res = await fetch("https://apis.aligo.in/send/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const result = (await res.json().catch(() => null)) as { result_code?: number | string } | null;
    if (!res.ok || !result || String(result.result_code) !== "1") {
      throw new Error("문자 발송에 실패했습니다. 번호를 확인하고 다시 시도해주세요.");
    }

    return { ok: true };
  });

// Checks the submitted code against the most recent OTP for that phone.
export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .validator(z.object({ phone: z.string().min(1), code: z.string().min(4) }).parse)
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);

    const { data: row } = await supabaseAdmin
      .from("phone_otps" as never)
      .select("id, code_hash, attempts, consumed_at, expires_at, created_at")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const otp = row as PhoneOtpRow | null;

    if (!otp) throw new Error("인증번호를 먼저 받아주세요.");
    if (otp.consumed_at) throw new Error("이미 사용한 인증번호예요. 다시 받아주세요.");
    if (new Date(otp.expires_at).getTime() < Date.now()) {
      throw new Error("인증번호가 만료되었어요. 다시 받아주세요.");
    }
    if (otp.attempts >= MAX_ATTEMPTS) {
      throw new Error("시도 횟수를 초과했어요. 다시 받아주세요.");
    }

    if (otp.code_hash !== hashCode(data.code.trim())) {
      await supabaseAdmin
        .from("phone_otps" as never)
        .update({ attempts: otp.attempts + 1 } as never)
        .eq("id", otp.id);
      throw new Error("인증번호가 올바르지 않아요.");
    }

    await supabaseAdmin
      .from("phone_otps" as never)
      .update({ consumed_at: new Date().toISOString() } as never)
      .eq("id", otp.id);

    return { ok: true };
  });

// Called right after the auth user is created/updated during onboarding, so
// Supabase's native (SMS-verified) phone column finally gets populated,
// closing the gap the roster-linking trigger comment originally flagged.
// Only succeeds if a matching OTP for that phone was consumed recently, so
// this can't be used to mark an arbitrary phone "verified" without the code.
export const confirmUserPhone = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().min(1), phone: z.string().min(1) }).parse)
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);

    const { data: row } = await supabaseAdmin
      .from("phone_otps" as never)
      .select("consumed_at")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const otp = row as { consumed_at: string | null } | null;
    if (!otp?.consumed_at || Date.now() - new Date(otp.consumed_at).getTime() > RECENT_VERIFY_WINDOW_MS) {
      throw new Error("전화번호 인증을 확인하지 못했습니다.");
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      phone,
      phone_confirm: true,
    });
    if (error) throw new Error(error.message);

    return { ok: true };
  });
