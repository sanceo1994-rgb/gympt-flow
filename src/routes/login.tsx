import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { ArrowUp, ChevronLeft, MessageCircle, Check, Mail, ArrowRight, Sparkles, Plus, X, Camera, Lock, Phone, UserRound } from "lucide-react";
import heroDumbbell from "@/assets/hero-dumbbell.png";
import trainerImg from "@/assets/role-trainer.png";
import studentImg from "@/assets/role-student.png";
import logo from "@/assets/pickgympt-logo.png";
import { OTTER_PRESETS, otterDataUrl } from "@/components/OtterPicker";
import { AvatarBuilder, AVATAR_COLORS, AVATAR_ICONS, avatarDataUrl } from "@/components/AvatarBuilder";
import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneNumber } from "@/lib/phone";
import { needsDisplayNameRepair, pickDisplayName } from "@/lib/display-name";
import { trackEvent } from "@/lib/analytics";
import { kakaoSdkLogin } from "@/lib/kakao-sdk";
import { kakaoBridgeLogin } from "@/lib/kakao-bridge.functions";
import { requestPhoneOtp, verifyPhoneOtp, confirmUserPhone } from "@/lib/phone-otp.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";



export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "로그인 — 픽짐피티 PickGymPT" }] }),
  component: Login,
});

type Step = "method" | "email" | "consent" | "role" | "confirm" | "preview" | "done";
type Role = "trainer" | "student";

const PALETTES: { id: string; label: string; from: string; to: string }[] = [
  { id: "pink", label: "픽짐 핑크", from: "#FF4E97", to: "#FF6FB1" },
  { id: "navy", label: "딥 네이비", from: "#0F172A", to: "#3B82F6" },
  { id: "forest", label: "포레스트", from: "#064E3B", to: "#10B981" },
  { id: "sunset", label: "선셋", from: "#F97316", to: "#E11D48" },
  { id: "violet", label: "바이올렛", from: "#6D28D9", to: "#C084FC" },
];

function clearLocalLoginState() {
  try {
    localStorage.removeItem("gympt-user");
    localStorage.removeItem("gympt-users");
    sessionStorage.removeItem("gympt-kakao-onboarding");
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("method");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [method, setMethod] = useState<"kakao" | "email">("kakao");
  const [agree, setAgree] = useState({ tos: false, priv: false, age: false });
  const [role, setRole] = useState<Role | null>(null);
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", avatar: "" });
  const [desktopAvatarColorId, setDesktopAvatarColorId] = useState(AVATAR_COLORS[0].id);
  const [desktopAvatarIconId, setDesktopAvatarIconId] = useState(AVATAR_ICONS[0].id);
  const [emailPw, setEmailPw] = useState({ email: "", password: "", confirm: "" });
  const [inviteCode, setInviteCode] = useState("");
  // Trainer mini-hompy customization
  const [palette, setPalette] = useState<string>("pink");
  const [trainerGym, setTrainerGym] = useState("");
  const [trainerSpecs, setTrainerSpecs] = useState<string[]>([]);
  const [specDraft, setSpecDraft] = useState("");
  const [trainerIntro, setTrainerIntro] = useState("");
  const [welcome, setWelcome] = useState<string | null>(null);
  const [emailMode, setEmailMode] = useState<"login" | "signup" | null>(null);
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);
  // Kakao often doesn't share a real email, so the bridge falls back to a
  // synthetic one — without this check, a returning member who previously
  // signed up by email would silently get a second, disconnected account.
  const [phoneDuplicate, setPhoneDuplicate] = useState(false);
  // Tracks the exact number that passed OTP verification — recomputed
  // against the current phone field so editing the number after verifying
  // correctly un-verifies it instead of leaving a stale "verified" badge.
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

  const allOk = agree.tos && agree.priv && agree.age;
  const phoneVerified =
    verifiedPhone !== null && verifiedPhone.replace(/\D/g, "") === profile.phone.replace(/\D/g, "");
  const desktopPhoneOtp = usePhoneOtp(profile.phone, phoneVerified, () => setVerifiedPhone(profile.phone));
  const toggleAll = (v: boolean) => setAgree({ tos: v, priv: v, age: v });

  useEffect(() => {
    if (step !== "confirm") return;
    if (method === "kakao" && profile.avatar && !profile.avatar.startsWith("data:image/svg+xml")) {
      return;
    }
    const color = AVATAR_COLORS.find((c) => c.id === desktopAvatarColorId) ?? AVATAR_COLORS[0];
    const icon = AVATAR_ICONS.find((i) => i.id === desktopAvatarIconId) ?? AVATAR_ICONS[0];
    const nextAvatar = avatarDataUrl(color.hex, icon);
    setProfile((current) => (current.avatar === nextAvatar ? current : { ...current, avatar: nextAvatar }));
  }, [desktopAvatarColorId, desktopAvatarIconId, method, profile.avatar, step]);

  useEffect(() => {
    const pending = sessionStorage.getItem("gympt-kakao-onboarding");
    if (!pending) return;
    try {
      const kakaoProfile = JSON.parse(pending) as typeof profile;
      setMethod("kakao");
      setProfile(kakaoProfile);
      setStep("consent");
    } catch {
      setEmailErr("카카오 프로필을 불러오지 못했습니다. 다시 로그인해주세요.");
    } finally {
      sessionStorage.removeItem("gympt-kakao-onboarding");
    }
  }, []);

  // Only relevant for the Kakao signup path — email signup already has its
  // own "existing account → login" branch in submitEmail().
  useEffect(() => {
    if (method !== "kakao") {
      setPhoneDuplicate(false);
      return;
    }
    const digits = profile.phone.replace(/\D/g, "");
    if (digits.length !== 11) {
      setPhoneDuplicate(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void supabase
        .rpc("phone_exists" as never, { check_phone: profile.phone } as never)
        .then(({ data }) => {
          if (!cancelled) setPhoneDuplicate(Boolean(data));
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [method, profile.phone]);

  // After a Kakao SDK login establishes a Supabase session in-page (no
  // redirect happened), branch the same way /auth/callback does: existing
  // members skip straight to /profile, new members continue onboarding.
  const completeKakaoSdkSession = async () => {
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    const kakaoUser = userResult.user;
    if (userError || !kakaoUser) throw new Error("카카오 로그인 세션을 확인하지 못했습니다.");

    const [{ data: roles }, { data: trainer }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", kakaoUser.id).limit(1),
      supabase.from("trainers").select("id").eq("user_id", kakaoUser.id).maybeSingle(),
    ]);

    if (trainer || (roles ?? []).length > 0) {
      trackEvent("Authentication Completed", {
        method: "kakao",
        flow: "login",
        role: trainer ? "trainer" : (roles?.[0]?.role ?? "unknown"),
      });
      setEmailBusy(false);
      setWelcome(
        pickDisplayName(kakaoUser.user_metadata?.name, kakaoUser.user_metadata?.full_name) ?? "회원",
      );
      setTimeout(() => {
        setWelcome(null);
        navigate({ to: "/profile" });
      }, 800);
      return;
    }

    const metadata = kakaoUser.user_metadata ?? {};
    setMethod("kakao");
    setProfile({
      name: pickDisplayName(metadata.name, metadata.full_name, metadata.nickname) ?? "",
      email: kakaoUser.email ?? "",
      phone: "",
      avatar: metadata.avatar_url || metadata.picture || "",
    });
    setEmailBusy(false);
    setStep("consent");
  };

  const startMethod = async (m: "kakao" | "email", kakaoMode: "quick" | "account" = "quick") => {
    setMethod(m);
    setEmailErr(null);
    if (m === "email") {
      setEmailMode(null);
      setStep("email");
      return;
    }

    setEmailBusy(true);
    clearLocalLoginState();
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);

    // Quick mode uses the Kakao JS SDK first. On PC this can hand off to a
    // running KakaoTalk desktop app; if the handoff is unavailable, we fall
    // back to the normal web OAuth page. Account mode skips the SDK and forces
    // Kakao to ask which account to use, which is safer on shared PCs.
    if (kakaoMode === "quick") {
      try {
        const accessToken = await kakaoSdkLogin();
        const { email, tokenHash } = await kakaoBridgeLogin({ data: { accessToken } });
        const { error: otpError } = await supabase.auth.verifyOtp({
          email,
          token_hash: tokenHash,
          type: "magiclink",
        });
        if (otpError) throw otpError;
        await completeKakaoSdkSession();
        return;
      } catch (sdkError) {
        console.warn("Kakao SDK login failed; falling back to OAuth redirect.", sdkError);
        if (localStorage.getItem("gympt-kakao-debug") === "1") {
          setEmailBusy(false);
          setEmailErr(
            `[debug] Kakao bridge failed: ${sdkError instanceof Error ? sdkError.message : String(sdkError)}`,
          );
          return;
        }
      }
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: kakaoMode === "account" ? { prompt: "login" } : undefined,
      },
    });
    if (error) {
      setEmailBusy(false);
      setEmailErr(error.message);
    }
  };

  const submitEmail = async () => {
    setEmailErr(null);
    if (!emailPw.email || !emailPw.password) {
      setEmailErr("이메일과 비밀번호를 입력해주세요");
      return;
    }
    setEmailBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailPw.email,
        password: emailPw.password,
      });
      if (error) {
        const { data: exists } = await supabase.rpc("email_exists", { check_email: emailPw.email });
        if (exists) {
          setEmailBusy(false);
          setEmailErr("비밀번호가 올바르지 않습니다");
          return;
        }
      }

      if (!error && data.user) {
        const [trainerResult, profileResult] = await Promise.all([
          supabase.from("trainers").select("name").eq("user_id", data.user.id).maybeSingle(),
          supabase.from("profiles").select("display_name").eq("id", data.user.id).maybeSingle(),
        ]);
        const metadataName = data.user.user_metadata?.name;
        const metadataFullName = data.user.user_metadata?.full_name;
        const trainerName = trainerResult.data?.name;
        const profileName = profileResult.data?.display_name;
        const displayName =
          pickDisplayName(
            trainerName,
            profileName,
            metadataName,
            metadataFullName,
            data.user.email?.split("@")[0],
          ) ?? "회원";

        const hasRepairableValue = [trainerName, profileName, metadataName, metadataFullName].some(
          (value) => needsDisplayNameRepair(value, displayName),
        );
        if (hasRepairableValue) {
          await Promise.allSettled([
            supabase.auth.updateUser({ data: { name: displayName, full_name: displayName } }),
            supabase.from("trainers").update({ name: displayName }).eq("user_id", data.user.id),
            supabase.from("profiles").update({ display_name: displayName }).eq("id", data.user.id),
          ]);
        }
        try {
          localStorage.removeItem("gympt-user");
          localStorage.removeItem("gympt-users");
          window.dispatchEvent(new Event("gympt-auth"));
        } catch {}
        setWelcome(`${displayName} 로그인`);
        trackEvent("Authentication Completed", {
          method: "email",
          flow: "login",
          role: data.user.user_metadata?.role ?? "unknown",
        });
        setTimeout(() => {
          setWelcome(null);
          navigate({ to: "/profile" });
        }, 800);
        return;
      }
    } finally {
      setEmailBusy(false);
    }

    // No matching credentials: continue into signup onboarding.
    setEmailMode("signup");
    setProfile({ name: "", email: emailPw.email, phone: "", avatar: "" });
    setEmailPw((p) => ({ ...p, confirm: "" }));
    setStep("consent");
  };

  const afterConsent = () => {
    setStep("role");
  };

  const completeSignup = async () => {
    if (!role) return;
    setEmailErr(null);
    setEmailBusy(true);

    if (method === "email") {
      const selectedPalette = PALETTES.find((item) => item.id === palette) ?? PALETTES[0];
      const normalizedPhone = formatPhoneNumber(profile.phone);
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: profile.email,
        password: emailPw.password,
        options: {
          emailRedirectTo: `${window.location.origin}/profile`,
          data: {
            name: profile.name,
            phone: normalizedPhone,
            role,
            avatar_url: profile.avatar || null,
            gym: role === "trainer" ? trainerGym : null,
            intro: role === "trainer" ? trainerIntro : null,
            specs: role === "trainer" ? trainerSpecs : [],
            theme_from: selectedPalette.from,
            theme_to: selectedPalette.to,
          },
        },
      });

      if (!error && signUpData.user) {
        // Best-effort: account creation already succeeded, so a failure here
        // (e.g. OTP verification window expired) shouldn't block signup — but
        // it must not be swallowed silently, or "phone never lands in
        // auth.users" becomes undiagnosable.
        await confirmUserPhone({ data: { userId: signUpData.user.id, phone: normalizedPhone } }).catch((e) =>
          console.error("[phone] confirmUserPhone failed (email signup):", e instanceof Error ? e.message : e),
        );
      }

      if (error) {
        setEmailBusy(false);
        setEmailErr(error.message);
        setStep("confirm");
        return;
      }
    } else {
      const selectedPalette = PALETTES.find((item) => item.id === palette) ?? PALETTES[0];
      const { data: userResult, error: userError } = await supabase.auth.getUser();
      const kakaoUser = userResult.user;
      if (userError || !kakaoUser) {
        setEmailBusy(false);
        setEmailErr("카카오 로그인 세션이 만료되었습니다. 다시 로그인해주세요.");
        setStep("method");
        return;
      }

      const normalizedPhone = formatPhoneNumber(profile.phone);
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          name: profile.name,
          full_name: profile.name,
          phone: normalizedPhone,
          role,
          avatar_url: profile.avatar || null,
          gym: role === "trainer" ? trainerGym : null,
          intro: role === "trainer" ? trainerIntro : null,
          theme_from: selectedPalette.from,
          theme_to: selectedPalette.to,
        },
      });
      if (metadataError) {
        setEmailBusy(false);
        setEmailErr(metadataError.message);
        setStep("confirm");
        return;
      }
      await confirmUserPhone({ data: { userId: kakaoUser.id, phone: normalizedPhone } }).catch((e) =>
        console.error("[phone] confirmUserPhone failed (kakao signup):", e instanceof Error ? e.message : e),
      );

      const writes = [
        supabase.from("profiles").upsert({
          id: kakaoUser.id,
          display_name: profile.name,
          email: profile.email || kakaoUser.email || null,
          avatar_url: profile.avatar || null,
        }),
        supabase.from("user_roles").upsert(
          { user_id: kakaoUser.id, role },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        ),
      ];
      if (role === "trainer") {
        writes.push(
          supabase.from("trainers").upsert(
            {
              user_id: kakaoUser.id,
              name: profile.name,
              gym: trainerGym || null,
              intro: trainerIntro || null,
              avatar_url: profile.avatar || null,
              theme_from: selectedPalette.from,
              theme_to: selectedPalette.to,
            },
            { onConflict: "user_id" },
          ),
        );
      }
      const writeResults = await Promise.all(writes);
      const writeError = writeResults.find((result) => result.error)?.error;
      if (writeError) {
        setEmailBusy(false);
        setEmailErr(writeError.message);
        setStep("confirm");
        return;
      }
    }

    setEmailBusy(false);
    trackEvent("Authentication Completed", {
      method,
      flow: "signup",
      role,
    });
    setWelcome(profile.name || "회원");
    setTimeout(() => {
      setWelcome(null);
      navigate({ to: "/profile" });
    }, 1800);
  };


  return (
    <div className="min-h-screen bg-surface grid lg:grid-cols-2">
      {/* LEFT — original brand visual (May 10) */}
      <div className="hidden lg:flex relative overflow-hidden bg-ink text-white p-10">
        <div className="absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-primary/40 blur-3xl" />
        <div className="absolute inset-0 bg-grid opacity-[0.08]" />
        <div className="relative flex flex-col h-full">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary grid place-items-center text-white font-black">G</div>
            <span className="font-extrabold tracking-tight">픽짐피티 PickGymPT</span>
          </Link>

          <div className="mt-auto">
            <img src={heroDumbbell} alt="" className="h-56 w-56 -ml-4" />
            <h1 className="mt-6 text-[40px] font-black leading-[1.05]">
              운동은 선생님이,<br /><span className="grad-pink-text">일정은 픽짐피티가.</span>
            </h1>
            <p className="mt-4 text-white/70 max-w-md">
              매주 카톡으로 시간 묻지 마세요. 학생은 원하는 시간을 고르고, AI가 최적 시간표를 만들어드려요.
            </p>
            <div className="mt-6 flex gap-6 text-[13px] text-white/60">
              <span><b className="text-white">1,200+</b> 트레이너</span>
              <span><b className="text-white">12,000+</b> 학생</span>
              <span><b className="text-white">92%</b> 1순위 매칭</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — stepped flow */}
      <main className="bg-white flex flex-col px-6 sm:px-10 pt-8 pb-10 lg:pt-14 relative">
        <Link to="/" className="lg:hidden flex items-center mb-4 self-start">
          <img src={logo} alt="픽짐피티" className="h-[66px] w-auto max-w-full object-contain" />
        </Link>
        {step !== "method" && step !== "done" && (
          <button
            onClick={() => setStep(
              step === "email" ? "method" :
              step === "consent" ? (method === "email" ? "email" : "method") :
              step === "role" ? "consent" :
              step === "confirm" ? "role" :
              step === "preview" ? "confirm" : "role"
            )}
            className="self-start h-9 px-2.5 rounded-full inline-flex items-center gap-1 text-[12px] font-bold text-ink-soft hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" /> 이전
          </button>
        )}

        <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
          {step !== "method" && <Stepper step={step} />}

            {step === "method" && (
              <div className="mt-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">로그인 / 회원가입</p>
                <h2 className="mt-3 text-[24px] font-black leading-tight">3초 만에 시작하기</h2>
                <p className="mt-2 text-[13px] text-ink-soft">처음이세요? 가입과 동시에 시작돼요. 이미 계정이 있으면 같은 입력으로 바로 로그인.</p>

                <button
                  onClick={() => startMethod("kakao", "quick")}
                  disabled={emailBusy}
                  className="mt-6 h-14 w-full rounded-2xl bg-[#FEE500] text-[#191600] text-[15px] font-extrabold inline-flex items-center justify-center gap-2 hover:brightness-95 disabled:cursor-wait disabled:opacity-60"
                >
                  <MessageCircle className="h-4 w-4 fill-[#191600]" />
                  {emailBusy ? "카카오로 이동 중..." : "카카오로 시작하기"}
                </button>

                <button
                  onClick={() => startMethod("kakao", "account")}
                  disabled={emailBusy}
                  className="mt-2 h-10 w-full rounded-xl border border-border bg-white text-[12px] font-extrabold text-ink-soft hover:bg-muted disabled:cursor-wait disabled:opacity-60"
                >
                  다른 카카오 계정으로 로그인
                </button>

                {emailErr && <p className="mt-3 text-[12px] font-bold text-destructive">{emailErr}</p>}

                <div className="mt-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[11px] font-bold text-ink-soft">또는</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <button
                  onClick={() => startMethod("email")}
                  className="mt-5 h-12 w-full rounded-2xl bg-white border border-border-strong text-ink text-[13.5px] font-bold inline-flex items-center justify-center gap-2 hover:bg-muted"
                >
                  <Mail className="h-4 w-4" /> 이메일로 계속하기
                </button>

                <p className="mt-6 text-[11.5px] text-ink-soft">카카오로 시작하면 이름·프로필·이메일을 자동으로 불러옵니다.</p>
              </div>
            )}

            {step === "email" && (
              <div className="mt-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">이메일로 계속하기</p>
                <h2 className="mt-3 text-[24px] font-black leading-tight">한 번에 로그인 · 가입</h2>
                <p className="mt-2 text-[13px] text-ink-soft">
                  이메일을 입력하면 <b className="text-ink">기존 회원은 로그인</b>, <b className="text-ink">처음이라면 가입</b>으로 자동 분기해드려요.
                </p>

                <form
                  className="mt-5 grid gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!emailBusy && emailPw.email && emailPw.password) void submitEmail();
                  }}
                >
                  <Field
                    label="이메일"
                    type="email"
                    value={emailPw.email}
                    onChange={(v) => { setEmailPw((p) => ({ ...p, email: v })); setEmailErr(null); setEmailMode(null); }}
                    placeholder="you@example.com"
                  />
                  <div>
                    <Field
                      label="비밀번호"
                      type="password"
                      value={emailPw.password}
                      onChange={(v) => { setEmailPw((p) => ({ ...p, password: v })); setEmailErr(null); }}
                      placeholder="영문+숫자+특수문자, 8자 이상"
                    />
                    {emailPw.password.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <PwRule ok={emailPw.password.length >= 8} label="8자 이상" />
                        <PwRule ok={/[a-zA-Z]/.test(emailPw.password)} label="영문" />
                        <PwRule ok={/\d/.test(emailPw.password)} label="숫자" />
                        <PwRule ok={/[^a-zA-Z0-9]/.test(emailPw.password)} label="특수문자" />
                      </div>
                    )}
                  </div>

                  {emailErr && <p className="text-[12px] font-bold text-destructive">{emailErr}</p>}

                  <button
                    type="submit"
                    disabled={emailBusy || !emailPw.email || !emailPw.password}
                    className="mt-3 h-12 w-full rounded-2xl bg-primary text-white text-[14px] font-extrabold disabled:opacity-40 inline-flex items-center justify-center gap-2 shadow-pop"
                  >
                    계속하기 <ArrowRight className="h-4 w-4" />
                  </button>
                </form>

                <p className="mt-4 text-center text-[11.5px] text-ink-soft">
                  비밀번호를 잊으셨나요? <a className="text-primary font-bold hover:underline" href="#">재설정</a>
                </p>
              </div>
            )}

            {step === "consent" && (
              <div className="mt-6">
                <h2 className="text-[22px] font-black leading-tight">잠깐, 약관에 동의해주세요</h2>
                <p className="mt-2 text-[13px] text-ink-soft">가입을 위해 필수 약관에 동의가 필요해요.</p>

                <div className="mt-5 rounded-2xl border border-border bg-surface-muted p-4">
                  <CheckRow bold label="전체 동의" checked={allOk} onChange={() => toggleAll(!allOk)} />
                  <div className="mt-3 grid gap-2 pl-1">
                    <CheckRow label="(필수) 만 14세 이상입니다" checked={agree.age} onChange={() => setAgree((a) => ({ ...a, age: !a.age }))} />
                    <CheckRow label="(필수) 이용약관 동의" checked={agree.tos} onChange={() => setAgree((a) => ({ ...a, tos: !a.tos }))} link="#" />
                    <CheckRow label="(필수) 개인정보 수집·이용 동의" checked={agree.priv} onChange={() => setAgree((a) => ({ ...a, priv: !a.priv }))} link="#" />
                  </div>
                </div>

                <button
                  onClick={afterConsent}
                  disabled={!allOk}
                  className="mt-6 h-12 w-full rounded-2xl bg-ink text-white text-[14px] font-extrabold disabled:opacity-40 inline-flex items-center justify-center gap-2"
                >
                  동의하고 계속하기 <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {step === "role" && (
              <div className="mt-6">
                <h2 className="text-[22px] font-black leading-tight">어떤 역할로 시작할까요?</h2>
                <p className="mt-2 text-[13px] text-ink-soft">나중에 언제든 바꿀 수 있어요.</p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <RoleCard title="트레이너" sub="회원 일정 자동 조율" img={trainerImg} active={role === "trainer"} onClick={() => setRole("trainer")} />
                  <RoleCard title="회원" sub="원하는 시간 선택" img={studentImg} active={role === "student"} onClick={() => setRole("student")} />

                </div>

                <button
                  onClick={() => setStep("confirm")}
                  disabled={!role}
                  className="mt-6 h-12 w-full rounded-2xl bg-ink text-white text-[14px] font-extrabold disabled:opacity-40 inline-flex items-center justify-center gap-2"
                >
                  다음 <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {step === "confirm" && (
              <div className="mt-6">
                <MobileSignupConfirm
                  method={method}
                  profile={profile}
                  setProfile={setProfile}
                  emailPw={emailPw}
                  setEmailPw={setEmailPw}
                  role={role}
                  emailBusy={emailBusy}
                  onTrainerNext={() => setStep("preview")}
                  onComplete={completeSignup}
                  phoneVerified={phoneVerified}
                  onPhoneVerified={() => setVerifiedPhone(profile.phone)}
                />
                <div className="hidden sm:block">
                <h2 className="text-[22px] font-black leading-tight">가입 정보를 확인해주세요</h2>
                <p className="mt-2 text-[13px] text-ink-soft">
                  {method === "kakao" ? "카카오에서 받아온 정보예요. 필요하면 수정할 수 있어요." : "기본 정보를 입력해주세요."}
                </p>

                <div className="mt-5 rounded-[26px] border border-border bg-white p-4 shadow-pop">
                  {method === "kakao" && profile.avatar && !profile.avatar.startsWith("data:image/svg+xml") ? (
                    <div className="mb-5 flex items-center gap-3 rounded-2xl bg-surface-muted p-3">
                      <img
                        src={profile.avatar}
                        alt=""
                        className="h-16 w-16 rounded-2xl bg-muted object-cover ring-2 ring-border"
                      />
                      <div className="min-w-0">
                        <p className="text-[12px] font-black text-ink">카카오 프로필 사진</p>
                        <p className="mt-1 text-[11.5px] font-semibold leading-snug text-ink-soft">
                          기본값으로 이 사진을 사용해요. 아래에서 직접 만든 아이콘으로 바꿀 수도 있어요.
                        </p>
                      </div>
                    </div>
                  ) : null}
                  <AvatarBuilder
                    colorId={desktopAvatarColorId}
                    iconId={desktopAvatarIconId}
                    onChange={({ colorId, iconId }) => {
                      setDesktopAvatarColorId(colorId);
                      setDesktopAvatarIconId(iconId);
                      const color = AVATAR_COLORS.find((c) => c.id === colorId) ?? AVATAR_COLORS[0];
                      const icon = AVATAR_ICONS.find((i) => i.id === iconId) ?? AVATAR_ICONS[0];
                      setProfile((p) => ({ ...p, avatar: avatarDataUrl(color.hex, icon) }));
                    }}
                  />
                  <span className="mt-4 inline-flex chip bg-primary/10 text-primary">
                    {role === "trainer" ? "?몃젅?대꼫" : "?뚯썝"}
                  </span>
                </div>

                <div className="hidden">
                  <div className="relative shrink-0">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt="" className="h-24 w-24 rounded-2xl bg-muted object-cover ring-2 ring-border" />
                    ) : (
                      <div className="h-24 w-24 rounded-2xl bg-surface-muted grid place-items-center text-[28px] font-black text-ink ring-2 ring-border">
                        {profile.name?.[0] || "?"}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="프로필 사진 업로드"
                      className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-ink text-white grid place-items-center ring-2 ring-white shadow-md hover:brightness-110"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setProfile((p) => ({ ...p, avatar: String(reader.result || "") }));
                        reader.readAsDataURL(file);
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-soft">기본 프로필 아이콘</p>
                    <div className="mt-1.5 grid grid-cols-3 grid-rows-2 gap-1.5">
                      {OTTER_PRESETS.map((preset) => {
                        const url = otterDataUrl(preset);
                        const active = profile.avatar === url;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setProfile((p) => ({ ...p, avatar: url }))}
                            title={preset.label}
                            className={`h-10 w-10 rounded-xl overflow-hidden border-2 transition ${active ? "border-primary shadow-pop" : "border-transparent hover:border-border-strong"}`}
                          >
                            <img src={url} alt={preset.label} className="h-full w-full block" />
                          </button>
                        );
                      })}
                    </div>
                    <span className="mt-2 inline-flex chip bg-primary/10 text-primary">{role === "trainer" ? "트레이너" : "회원"}</span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <Field label="이름" value={profile.name} onChange={(v) => setProfile((p) => ({ ...p, name: v }))} placeholder="홍길동" hint="실명을 입력하면 트레이너/회원이 더 원활하게 알아볼 수 있어요" />
                  <Field label="이메일" type="email" value={profile.email} onChange={(v) => setProfile((p) => ({ ...p, email: v }))} placeholder="you@example.com" />
                  <div>
                    <Field
                      label="전화번호"
                      type="tel"
                      value={profile.phone}
                      onChange={(v) => setProfile((p) => ({ ...p, phone: formatPhoneNumber(v) }))}
                      placeholder="010-0000-0000"
                      action={<PhoneVerifyTrigger otp={desktopPhoneOtp} />}
                    />
                    <PhoneVerifyCodeRow otp={desktopPhoneOtp} />
                    {method === "kakao" && phoneDuplicate && (
                      <div className="mt-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                        <p className="text-[12px] font-bold text-destructive leading-snug">
                          이 번호로 이미 가입된 계정이 있어요. 카카오로 계속하면 별도 계정이 새로
                          만들어져요.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setMethod("email");
                            setEmailMode(null);
                            setStep("email");
                          }}
                          className="mt-2 h-9 px-3.5 rounded-full bg-ink text-white text-[12px] font-extrabold"
                        >
                          이메일로 로그인하기
                        </button>
                      </div>
                    )}
                  </div>
                  {method === "email" && (
                    <>
                      <div>
                        <Field label="비밀번호" type="password" value={emailPw.password} onChange={(v) => setEmailPw((p) => ({ ...p, password: v }))} placeholder="영문+숫자+특수문자, 8자 이상" />
                        {emailPw.password.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <PwRule ok={emailPw.password.length >= 8} label="8자 이상" />
                            <PwRule ok={/[a-zA-Z]/.test(emailPw.password)} label="영문" />
                            <PwRule ok={/\d/.test(emailPw.password)} label="숫자" />
                            <PwRule ok={/[^a-zA-Z0-9]/.test(emailPw.password)} label="특수문자" />
                          </div>
                        )}
                      </div>
                      <div>
                        <Field label="비밀번호 확인" type="password" value={emailPw.confirm} onChange={(v) => setEmailPw((p) => ({ ...p, confirm: v }))} placeholder="한 번 더 입력해주세요" />
                        {emailPw.confirm.length > 0 && (
                          emailPw.password === emailPw.confirm ? (
                            <p className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-bold text-emerald-600"><Check className="h-3.5 w-3.5" /> 비밀번호가 일치해요</p>
                          ) : (
                            <p className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-bold text-destructive"><X className="h-3.5 w-3.5" /> 비밀번호가 일치하지 않아요</p>
                          )
                        )}
                      </div>
                    </>
                  )}


                  {role === "trainer" && (
                    <>
                      <Field label="소속 헬스장 (지점)" value={trainerGym} onChange={setTrainerGym} placeholder="하이엔드 피트니스 강남점" />
                      <div className="block">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">전문 분야 · 자격 · 수상</span>
                        <p className="mt-1 text-[11px] text-ink-soft">하나씩 추가해주세요. 예) NSCA-CPT · 2024 머슬마니아 그랑프리 · 다이어트 8년</p>
                        <div className="mt-2 flex gap-2">
                          <input
                            value={specDraft}
                            onChange={(e) => setSpecDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const v = specDraft.trim();
                                if (v && !trainerSpecs.includes(v)) setTrainerSpecs([...trainerSpecs, v]);
                                setSpecDraft("");
                              }
                            }}
                            placeholder="예: 2024 머슬마니아 그랑프리"
                            className="flex-1 h-11 px-3.5 rounded-xl bg-surface-muted border border-border focus:bg-white focus:border-ink outline-none text-[13px] text-ink"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const v = specDraft.trim();
                              if (v && !trainerSpecs.includes(v)) setTrainerSpecs([...trainerSpecs, v]);
                              setSpecDraft("");
                            }}
                            disabled={!specDraft.trim()}
                            className="h-11 px-3.5 rounded-xl bg-ink text-white text-[12px] font-extrabold inline-flex items-center gap-1 disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" /> 추가
                          </button>
                        </div>
                        {trainerSpecs.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {trainerSpecs.map((s, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full bg-primary/10 text-primary text-[12px] font-bold">
                                {s}
                                <button
                                  type="button"
                                  onClick={() => setTrainerSpecs(trainerSpecs.filter((_, idx) => idx !== i))}
                                  className="hover:text-ink"
                                  aria-label="삭제"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <label className="block">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">트레이너 한 줄 소개</span>
                        <textarea
                          value={trainerIntro}
                          onChange={(e) => setTrainerIntro(e.target.value)}
                          rows={9}
                          placeholder={"평생 가져갈 운동 습관을 만들어드려요.\n부상 없는 점진적 과부하 전문.\n\n- 운동 철학 / 지도 스타일\n- 함께하면 좋은 회원상\n- 주요 성과·후기 한 줄"}
                          className="mt-1.5 w-full min-h-[200px] px-3.5 py-3 rounded-xl bg-surface-muted border border-border focus:bg-white focus:border-ink outline-none text-[13.5px] text-ink resize-y leading-relaxed"
                        />
                      </label>

                      <div className="rounded-xl bg-white border border-border p-3.5">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink">미니홈피 컬러 팔레트</p>
                        <p className="mt-1 text-[11.5px] text-ink-soft leading-relaxed">내 예약 페이지의 헤더·강조 컬러로 사용돼요.</p>
                        <div className="mt-3 grid grid-cols-5 gap-2">
                          {PALETTES.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setPalette(p.id)}
                              className={`group rounded-xl p-1.5 border-2 transition ${palette === p.id ? "border-ink shadow-pop" : "border-transparent hover:border-border"}`}
                              title={p.label}
                            >
                              <div className="h-10 rounded-lg" style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }} />
                              <p className="mt-1 text-[10px] font-bold text-ink-soft text-center truncate">{p.label}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl bg-primary/[0.04] border border-primary/20 p-3.5">
                        <p className="text-[11px] font-extrabold text-primary uppercase tracking-wider">초대 코드 (선택)</p>
                        <p className="mt-1 text-[11.5px] text-ink-soft leading-relaxed">동료 트레이너의 초대 코드를 입력하면 <b className="text-ink">두 분 모두 1주일 무료 구독</b>이 적립돼요.</p>
                        <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="PGPT-XXXX-XXX"
                          className="mt-2.5 h-10 w-full px-3 rounded-lg bg-white border border-border focus:border-ink outline-none text-[13px] font-bold text-ink tabular-nums" />
                      </div>

                      <div className="rounded-xl bg-primary/5 border border-primary/30 p-3 flex items-center gap-2">
                        <span className="h-8 w-8 rounded-full bg-primary text-white grid place-items-center shrink-0">
                          <Check className="h-4 w-4" strokeWidth={4} />
                        </span>
                        <p className="text-[12px] text-ink leading-snug"><b className="text-primary">첫 100명 트레이너</b> 한정! 가입과 동시에 <b>인증 배지</b>가 프로필에 표시돼요.</p>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => role === "trainer" ? setStep("preview") : completeSignup()}
                  disabled={!profile.name || !profile.email || !phoneVerified || (method === "kakao" && phoneDuplicate) || (method === "email" && (!pwStrong(emailPw.password) || emailPw.password !== emailPw.confirm))}
                  className="mt-6 h-12 w-full rounded-2xl bg-primary text-white text-[14px] font-extrabold disabled:opacity-40 inline-flex items-center justify-center gap-2 shadow-pop"
                >
                  {role === "trainer" ? (<><ArrowRight className="h-4 w-4" /> 다음: 내 프로필 미리보기</>) : (<><Check className="h-4 w-4" /> 회원가입 완료</>)}
                </button>
                <p className="mt-3 text-center text-[11px] text-ink-soft">가입 정보는 안전하게 계정에 저장됩니다.</p>
                </div>
              </div>
            )}

            {step === "preview" && (
              <TrainerPreview
                name={profile.name}
                avatar={profile.avatar}
                gym={trainerGym}
                specs={trainerSpecs}
                intro={trainerIntro}
                paletteId={palette}
                onBack={() => setStep("confirm")}
                onConfirm={completeSignup}
              />
            )}
          </div>
      </main>

      {emailBusy && step === "method" && (
        <AuthStatusOverlay
          icon={<MessageCircle className="h-5 w-5 fill-current" />}
          title="카카오 계정으로 이동하고 있어요"
          description="PC에서는 매번 계정을 다시 확인하도록 연결했어요."
          tone="kakao"
        />
      )}

      {welcome && (
        <AuthStatusOverlay
          icon={<Sparkles className="h-5 w-5" />}
          title={`${welcome}님, 로그인 완료`}
          description="내 정보 화면으로 이동하고 있어요."
          tone="success"
        />
      )}


    </div>
  );
}

function AuthStatusOverlay({
  icon,
  title,
  description,
  tone,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  tone: "kakao" | "success";
}) {
  return (
    <div className="fixed inset-x-0 top-5 z-[80] mx-auto w-[min(420px,calc(100vw-24px))] animate-in fade-in slide-in-from-top-2">
      <div className="rounded-2xl border border-border bg-white/95 p-3.5 shadow-pop backdrop-blur">
        <div className="flex items-center gap-3">
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
              tone === "kakao" ? "bg-[#FEE500] text-[#191600]" : "bg-primary text-white"
            }`}
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-black leading-tight text-ink">{title}</p>
            <p className="mt-0.5 text-[12px] font-semibold leading-snug text-ink-soft">{description}</p>
          </div>
          {tone === "kakao" ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink/15 border-t-ink" />
          ) : (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-primary">
              <Check className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const order: Step[] = ["consent", "role", "confirm", "preview"];
  const idx = order.indexOf(step);
  if (idx < 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      {order.map((s, i) => (
        <div key={s} className={`h-1.5 rounded-full transition-all ${i <= idx ? "bg-primary" : "bg-muted"} ${i === idx ? "w-8" : "w-5"}`} />
      ))}
      <span className="ml-2 text-[11px] font-bold text-ink-soft tabular-nums">{idx + 1} / {order.length}</span>
    </div>
  );
}

function MobileSignupConfirm({
  method,
  profile,
  setProfile,
  emailPw,
  setEmailPw,
  role,
  emailBusy,
  onTrainerNext,
  onComplete,
  phoneVerified,
  onPhoneVerified,
}: {
  method: "kakao" | "email";
  profile: { name: string; email: string; phone: string; avatar: string };
  setProfile: Dispatch<SetStateAction<{ name: string; email: string; phone: string; avatar: string }>>;
  emailPw: { email: string; password: string; confirm: string };
  setEmailPw: Dispatch<SetStateAction<{ email: string; password: string; confirm: string }>>;
  role: Role | null;
  emailBusy: boolean;
  onTrainerNext: () => void;
  onComplete: () => void;
  phoneVerified: boolean;
  onPhoneVerified: () => void;
}) {
  type StepKey = "name" | "phone" | "email" | "password" | "confirm" | "avatar";
  const [active, setActive] = useState<StepKey>("name");
  const [avatarColorId, setAvatarColorId] = useState(AVATAR_COLORS[0].id);
  const [avatarIconId, setAvatarIconId] = useState(AVATAR_ICONS[0].id);

  // Profile pictures are the lowest-priority field and a camera-roll picker
  // is extra friction on mobile, so it's a quick color+icon builder, asked
  // last, after every required field is already filled.
  useEffect(() => {
    if (method === "kakao" && profile.avatar && !profile.avatar.startsWith("data:image/svg+xml")) {
      return;
    }
    const color = AVATAR_COLORS.find((c) => c.id === avatarColorId) ?? AVATAR_COLORS[0];
    const icon = AVATAR_ICONS.find((i) => i.id === avatarIconId) ?? AVATAR_ICONS[0];
    const nextAvatar = avatarDataUrl(color.hex, icon);
    setProfile((p) => (p.avatar === nextAvatar ? p : { ...p, avatar: nextAvatar }));
  }, [avatarColorId, avatarIconId, method, profile.avatar, setProfile]);

  // Kakao already has a password (and a real profile photo), so those steps
  // only apply to email signup.
  const steps = [
    { key: "name" as const, label: "이름", icon: UserRound, value: profile.name, valid: profile.name.trim().length > 0 },
    { key: "phone" as const, label: "전화번호", icon: Phone, value: profile.phone, valid: phoneVerified },
    { key: "email" as const, label: "이메일", icon: Mail, value: profile.email, valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim()) },
    ...(method === "email"
      ? [
          { key: "password" as const, label: "비밀번호", icon: Lock, value: emailPw.password, valid: pwStrong(emailPw.password) },
          { key: "confirm" as const, label: "비밀번호 확인", icon: Check, value: emailPw.confirm, valid: emailPw.confirm.length > 0 && emailPw.password === emailPw.confirm },
        ]
      : []),
    { key: "avatar" as const, label: "프로필 아이콘", icon: Camera, value: "", valid: true },
  ];
  const currentIndex = Math.max(0, steps.findIndex((step) => step.key === active));
  const current = steps[currentIndex] ?? steps[0];
  const doneCount = steps.filter((step) => step.valid).length;
  const Icon = current.icon;
  const phoneOtp = usePhoneOtp(profile.phone, phoneVerified, onPhoneVerified);

  // Tracks fill order (newest first) so the summary list above the floating
  // panel only ever shows what's actually been entered, stacking new entries
  // on top and pushing earlier ones down — instead of a static checklist of
  // every remaining field.
  const [completionOrder, setCompletionOrder] = useState<StepKey[]>([]);
  const validKey = steps.map((s) => `${s.key}:${s.valid}`).join("|");
  useEffect(() => {
    setCompletionOrder((prev) => {
      let next = prev;
      for (const step of steps) {
        if (step.key === "avatar") continue;
        const has = next.includes(step.key);
        if (step.valid && !has) next = [step.key, ...next];
        if (!step.valid && has) next = next.filter((k) => k !== step.key);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validKey]);

  const setValue = (value: string) => {
    if (current.key === "name") setProfile((p) => ({ ...p, name: value }));
    if (current.key === "phone") setProfile((p) => ({ ...p, phone: formatPhoneNumber(value) }));
    if (current.key === "email") setProfile((p) => ({ ...p, email: value.trim() }));
    if (current.key === "password") setEmailPw((p) => ({ ...p, password: value }));
    if (current.key === "confirm") setEmailPw((p) => ({ ...p, confirm: value }));
  };

  const moveNext = () => {
    if (!current.valid) return;
    const next = steps[currentIndex + 1];
    if (next) setActive(next.key);
    else if (role === "trainer") onTrainerNext();
    else onComplete();
  };

  return (
    <div className="sm:hidden">
      <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 text-[11px] font-extrabold text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        빠른 가입
      </span>
      <h2 className="mt-3 text-[25px] font-black leading-tight tracking-tight">
        입력한 정보를
        <br />
        바로 확인하며 가입해요
      </h2>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>

      {completionOrder.length > 0 && (
        <div className="mt-5 grid gap-2">
          {completionOrder.map((key) => {
            const step = steps.find((s) => s.key === key);
            if (!step) return null;
            const StepIcon = step.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActive(step.key)}
                className="flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-white px-3.5 py-2.5 text-left animate-in fade-in slide-in-from-top-2 duration-300"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-white">
                  <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10.5px] font-extrabold text-ink-soft">{step.label}</span>
                  <span className="mt-0.5 block truncate text-[13px] font-black text-ink">
                    {step.key === "password" || step.key === "confirm" ? "입력 완료" : step.value}
                  </span>
                </span>
                <StepIcon className="h-4 w-4 shrink-0 text-ink-soft" />
              </button>
            );
          })}
        </div>
      )}

      {current.key === "avatar" ? (
        <div key={current.key} className="mt-5 rounded-[26px] border border-border bg-white p-4 shadow-pop animate-in fade-in slide-in-from-right-3 duration-300">
          <p className="text-[12px] font-extrabold text-ink-soft">{current.label}</p>
          <p className="mt-0.5 text-[19px] font-black leading-tight text-ink">색상과 아이콘으로 나만의 아이콘을 만들어요</p>
          <div className="mt-4">
            <AvatarBuilder
              colorId={avatarColorId}
              iconId={avatarIconId}
              onChange={({ colorId, iconId }) => {
                setAvatarColorId(colorId);
                setAvatarIconId(iconId);
                const color = AVATAR_COLORS.find((c) => c.id === colorId) ?? AVATAR_COLORS[0];
                const icon = AVATAR_ICONS.find((i) => i.id === iconId) ?? AVATAR_ICONS[0];
                setProfile((p) => ({ ...p, avatar: avatarDataUrl(color.hex, icon) }));
              }}
            />
          </div>
          <button
            type="button"
            onClick={moveNext}
            disabled={emailBusy}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-extrabold text-white shadow-pop disabled:opacity-40"
          >
            {emailBusy ? "처리 중..." : role === "trainer" ? "프로필 미리보기" : "회원가입 완료"}
          </button>
        </div>
      ) : (
        <div key={current.key} className="mt-5 rounded-[26px] bg-ink p-4 text-white shadow-pop animate-in fade-in slide-in-from-right-3 duration-300">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-extrabold text-white/55">{current.label}</p>
                {current.key === "phone" && <PhoneVerifyTrigger otp={phoneOtp} tone="dark" />}
              </div>
              <p className="mt-0.5 text-[19px] font-black leading-tight">{mobileQuestion(current.key)}</p>
            </div>
          </div>
          <input
            autoFocus
            type={current.key === "password" || current.key === "confirm" ? "password" : current.key === "email" ? "email" : "text"}
            inputMode={current.key === "phone" ? "numeric" : current.key === "email" ? "email" : "text"}
            value={current.value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") moveNext();
            }}
            placeholder={mobilePlaceholder(current.key)}
            className="mt-4 h-14 w-full rounded-2xl border border-white/10 bg-white px-4 text-[17px] font-black text-ink outline-none placeholder:text-ink-soft/45 focus:ring-4 focus:ring-primary/30"
          />
          {current.key === "password" && emailPw.password.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <PwRule ok={emailPw.password.length >= 8} label="8자 이상" />
              <PwRule ok={/[a-zA-Z]/.test(emailPw.password)} label="영문" />
              <PwRule ok={/\d/.test(emailPw.password)} label="숫자" />
              <PwRule ok={/[^a-zA-Z0-9]/.test(emailPw.password)} label="특수문자" />
            </div>
          )}
          {current.key === "phone" && <PhoneVerifyCodeRow otp={phoneOtp} tone="dark" />}
          <button
            type="button"
            onClick={moveNext}
            disabled={emailBusy || !current.valid}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-extrabold text-white shadow-pop disabled:opacity-40"
          >
            {emailBusy ? "처리 중..." : "다음"}
            {!emailBusy && <ArrowUp className="h-4 w-4 rotate-90" />}
          </button>
        </div>
      )}
    </div>
  );
}

function mobileQuestion(key: "name" | "phone" | "email" | "password" | "confirm" | "avatar") {
  if (key === "name") return "어떻게 불러드릴까요?";
  if (key === "phone") return "연락받을 번호는요?";
  if (key === "email") return "로그인 이메일은요?";
  if (key === "password") return "비밀번호를 정해주세요";
  if (key === "confirm") return "비밀번호를 한 번 더 입력해주세요";
  return "";
}

function mobilePlaceholder(key: "name" | "phone" | "email" | "password" | "confirm" | "avatar") {
  if (key === "name") return "홍길동";
  if (key === "phone") return "010-0000-0000";
  if (key === "email") return "you@example.com";
  if (key === "password") return "영문+숫자+특수문자, 8자 이상";
  if (key === "confirm") return "비밀번호 확인";
  return "";
}

function TrainerPreview({
  name, avatar, gym, specs, intro, paletteId, onBack, onConfirm,
}: {
  name: string; avatar: string; gym: string; specs: string[]; intro: string;
  paletteId: string; onBack: () => void; onConfirm: () => void;
}) {
  const p = PALETTES.find((x) => x.id === paletteId) ?? PALETTES[0];
  const initial = name?.[0] || "?";
  return (
    <div className="mt-6">
      <h2 className="text-[22px] font-black leading-tight">내 프로필 미리보기</h2>
      <p className="mt-2 text-[13px] text-ink-soft">학생이 보게 될 예약 페이지예요. 마음에 들면 회원가입을 완료해주세요.</p>

      {/* Mock booking header */}
      <div className="mt-5 rounded-2xl overflow-hidden border border-border bg-white shadow-pop">
        <div className="relative h-20 sm:h-24 px-5" style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}>
          <div className="absolute inset-0 bg-grid opacity-[0.12]" />
          <span className="absolute top-3 right-3 chip bg-white/20 text-white backdrop-blur">미니홈피 · {p.label}</span>
        </div>
        <div className="px-5 pb-5">
          <div className="-mt-10 relative z-10">
            {avatar ? (
              <img src={avatar} alt="" className="h-20 w-20 rounded-2xl object-cover ring-4 ring-white bg-muted" />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-white ring-4 ring-white grid place-items-center text-[28px] font-black text-ink shadow">
                {initial}
              </div>
            )}
          </div>
          <div className="mt-3">
            <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: p.from }}>PickGymPT 트레이너</p>
            <h3 className="mt-1 text-[20px] font-black tracking-tight text-ink leading-tight">{name || "이름"} 트레이너</h3>
            <p className="mt-0.5 text-[12px] text-ink-soft">{gym || "소속 헬스장"}</p>
          </div>

          {specs.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {specs.map((s, i) => (
                <span key={i} className="inline-flex items-center px-2.5 h-7 rounded-full bg-primary/10 text-primary text-[11.5px] font-bold">{s}</span>
              ))}
            </div>
          )}

          <div className="mt-4 rounded-xl bg-surface-muted border border-border p-3.5">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">트레이너 소개</p>
            <p className="mt-1.5 text-[13px] text-ink leading-relaxed whitespace-pre-wrap">
              {intro || "(아직 소개글이 비어있어요)"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          onClick={onBack}
          className="h-12 flex-1 rounded-2xl bg-white border border-border-strong text-ink text-[13px] font-extrabold hover:bg-muted"
        >
          수정하기
        </button>
        <button
          onClick={onConfirm}
          className="h-12 flex-[1.6] rounded-2xl bg-primary text-white text-[14px] font-extrabold inline-flex items-center justify-center gap-2 shadow-pop hover:brightness-110"
        >
          <Check className="h-4 w-4" /> 마음에 들어요, 회원가입 완료
        </button>
      </div>
    </div>
  );
}

function CheckRow({ label, checked, onChange, link, bold }: { label: string; checked: boolean; onChange: () => void; link?: string; bold?: boolean }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <button
        type="button"
        onClick={onChange}
        className={`h-5 w-5 rounded-md grid place-items-center transition shrink-0 ${checked ? "bg-primary text-white" : "bg-white border border-border-strong"}`}
        aria-pressed={checked}
      >
        {checked && <Check className="h-3.5 w-3.5" />}
      </button>
      <span className={`flex-1 text-[13px] ${bold ? "font-extrabold text-ink" : "text-ink-soft"}`}>{label}</span>
      {link && <a href={link} className="text-[11px] text-ink-soft underline">보기</a>}
    </label>
  );
}

function RoleCard({ title, sub, img, active, onClick }: { title: string; sub: string; img: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`group relative rounded-2xl border-2 p-4 text-left transition bg-white ${active ? "border-primary shadow-pop -translate-y-0.5" : "border-border hover:border-ink/50"}`}
    >
      <div className="aspect-square w-full grid place-items-center overflow-hidden">
        <img src={img} alt="" className="h-32 w-32 object-contain drop-shadow-md" />
      </div>
      <h3 className="mt-1 text-[15px] font-black tracking-tight">{title}</h3>
      <p className="mt-0.5 text-[11.5px] text-ink-soft">{sub}</p>
      <span className={`absolute top-3 right-3 h-5 w-5 rounded-full grid place-items-center transition ${active ? "bg-primary text-white" : "bg-muted text-transparent"}`}>
        <Check className="h-3 w-3" />
      </span>
    </button>
  );
}


function Field({ label, value, onChange, placeholder, type = "text", hint, action }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; hint?: string; action?: ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft inline-flex items-center gap-2 flex-wrap">
          {label}
          {hint && <span className="text-[10.5px] font-medium normal-case tracking-normal text-muted-foreground">· {hint}</span>}
        </span>
        {action}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 h-11 w-full px-3.5 rounded-xl bg-surface-muted border border-border focus:bg-white focus:border-ink outline-none text-[14px] font-semibold text-ink"
      />
    </label>
  );
}

// Shared SMS OTP state for the phone field. The trigger/badge renders inline
// at the top-right of the field (next to the label); the code-entry row
// renders below the input once a code has been sent.
function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  const maskedName = name.length <= 2 ? `${name[0]}*` : `${name.slice(0, 2)}${"*".repeat(Math.max(name.length - 2, 3))}`;
  const [domainName, ...domainRest] = domain.split(".");
  const maskedDomain = domainName.length <= 2 ? `${domainName[0]}*` : `${domainName.slice(0, 2)}${"*".repeat(Math.max(domainName.length - 2, 3))}`;
  return `${maskedName}@${maskedDomain}${domainRest.length ? "." + domainRest.join(".") : ""}`;
}

const PROVIDER_LABELS: Record<string, string> = { kakao: "카카오", email: "이메일" };

function usePhoneOtp(phone: string, verified: boolean, onVerified: () => void) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [duplicate, setDuplicate] = useState<{ provider: string; email: string } | null>(null);
  const phoneValid = phone.replace(/\D/g, "").length === 11;

  useEffect(() => {
    setSent(false);
    setCode("");
    setErr(null);
    setCooldown(0);
    setDuplicate(null);
  }, [phone]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async () => {
    setErr(null);
    setBusy(true);
    try {
      const { data: existing } = await supabase
        .rpc("phone_account_info" as never, { check_phone: phone } as never)
        .maybeSingle();
      const account = existing as { email: string | null; provider: string } | null;
      if (account) {
        setDuplicate({
          provider: PROVIDER_LABELS[account.provider] ?? account.provider,
          email: account.email ? maskEmail(account.email) : "정보 없음",
        });
        return;
      }
      await requestPhoneOtp({ data: { phone } });
      setSent(true);
      setCooldown(60);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "인증번호 발송에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setErr(null);
    setBusy(true);
    try {
      await verifyPhoneOtp({ data: { phone, code } });
      onVerified();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "인증번호 확인에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  return {
    sent,
    code,
    setCode,
    busy,
    err,
    cooldown,
    phoneValid,
    verified,
    send,
    verify,
    duplicate,
    clearDuplicate: () => setDuplicate(null),
  };
}

// Small inline trigger for the field's label row — "인증요청" button that
// turns into a "인증완료" badge, mirroring the usual phone-OTP form layout
// (label left, verify action top-right, code row appears below the input).
function PhoneVerifyTrigger({
  otp,
  tone = "light",
}: {
  otp: ReturnType<typeof usePhoneOtp>;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  if (otp.verified) {
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${dark ? "text-emerald-300" : "text-emerald-600"}`}>
        <Check className="h-3 w-3" /> 인증완료
      </span>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={otp.send}
        disabled={!otp.phoneValid || otp.busy}
        className={`h-6 px-2.5 rounded-full text-[10.5px] font-extrabold disabled:opacity-40 ${dark ? "bg-white/15 text-white" : "bg-ink text-white"}`}
      >
        {otp.busy && !otp.sent ? "발송 중..." : otp.sent ? "재전송" : "인증요청"}
      </button>
      <Dialog open={!!otp.duplicate} onOpenChange={(v) => !v && otp.clearDuplicate()}>
        <DialogContent className="max-w-[420px] text-center">
          <DialogHeader>
            <DialogTitle className="text-center">
              이미 가입한 계정입니다.
              <br />
              기존 계정으로 로그인 해주세요.
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-2 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-ink-soft font-bold">가입 수단</span>
              <span className="font-bold text-ink">{otp.duplicate?.provider}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-soft font-bold">이메일 주소</span>
              <span className="font-bold text-ink">{otp.duplicate?.email}</span>
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={otp.clearDuplicate}
              className="w-full h-12 rounded-full bg-ink text-white text-[14px] font-extrabold"
            >
              확인
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Code-entry row shown under the phone input once a code has been sent.
function PhoneVerifyCodeRow({
  otp,
  tone = "light",
}: {
  otp: ReturnType<typeof usePhoneOtp>;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  if (otp.verified || !otp.sent) {
    return otp.err ? (
      <p className={`mt-1.5 text-[11.5px] font-bold ${dark ? "text-rose-300" : "text-destructive"}`}>{otp.err}</p>
    ) : null;
  }
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <input
          value={otp.code}
          onChange={(e) => otp.setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="인증번호 6자리"
          inputMode="numeric"
          className={
            dark
              ? "h-10 w-32 px-3 rounded-xl border border-white/15 bg-white/10 outline-none text-[13px] font-bold text-white placeholder:text-white/40 tabular-nums focus:border-white/40"
              : "h-10 w-32 px-3 rounded-xl bg-surface-muted border border-border focus:bg-white focus:border-ink outline-none text-[13px] font-bold text-ink tabular-nums"
          }
        />
        <button
          type="button"
          onClick={otp.verify}
          disabled={otp.busy || otp.code.length < 4}
          className="h-10 px-3.5 rounded-xl bg-primary text-white text-[12px] font-extrabold disabled:opacity-40"
        >
          확인
        </button>
        {otp.cooldown > 0 && (
          <span className={`text-[11.5px] font-bold ${dark ? "text-white/60" : "text-ink-soft"}`}>
            재전송 {otp.cooldown}s
          </span>
        )}
      </div>
      {otp.err && (
        <p className={`mt-1.5 text-[11.5px] font-bold ${dark ? "text-rose-300" : "text-destructive"}`}>{otp.err}</p>
      )}
    </div>
  );
}

function pwStrong(pw: string): boolean {
  return pw.length >= 8 && /[a-zA-Z]/.test(pw) && /\d/.test(pw) && /[^a-zA-Z0-9]/.test(pw);
}

function PwRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11px] font-bold border ${ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-surface-muted text-ink-soft border-border"}`}>
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} {label}
    </span>
  );
}

