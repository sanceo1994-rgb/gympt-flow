import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, MessageCircle, Check, Mail } from "lucide-react";
import heroImg from "@/assets/login-hero.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "로그인 — 짐피티 GymPT" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingMethod, setPendingMethod] = useState<"kakao" | "email" | null>(null);
  const [agree, setAgree] = useState({ all: false, tos: false, priv: false, age: false });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate({ to: "/onboarding/role" });
  }, [user, navigate]);

  const allOk = agree.tos && agree.priv && agree.age;
  const toggleAll = (v: boolean) => setAgree({ all: v, tos: v, priv: v, age: v });
  const toggle = (k: "tos" | "priv" | "age") => {
    const next = { ...agree, [k]: !agree[k] };
    next.all = next.tos && next.priv && next.age;
    setAgree(next);
  };

  const startKakao = () => { setPendingMethod("kakao"); setConsentOpen(true); };
  const startEmail = () => { setPendingMethod("email"); setConsentOpen(true); };

  const proceed = async () => {
    setError(null);
    if (!allOk) { setError("필수 항목에 모두 동의해주세요."); return; }
    if (pendingMethod === "kakao") {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: { redirectTo: window.location.origin + "/onboarding/role" },
      });
      if (error) setError("카카오 로그인 설정이 필요합니다. 운영자에게 문의해주세요.");
    } else {
      navigate({ to: "/signup-email" });
    }
  };

  return (
    <div className="min-h-screen bg-surface-muted text-ink">
      <div className="mx-auto max-w-[1200px] min-h-screen grid lg:grid-cols-2">
        {/* LEFT — hero (existing content) */}
        <aside className="relative bg-white lg:bg-transparent flex flex-col px-8 pt-8 pb-6 lg:pt-16">
          <Link to="/" aria-label="뒤로" className="h-10 w-10 grid place-items-center rounded-full hover:bg-muted self-start lg:hidden">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="mt-2 text-[26px] sm:text-[32px] font-black leading-[1.2] tracking-tight">
            짐피티 사용을<br />시작해볼까요?
          </h1>
          <p className="mt-3 text-[14px] text-ink-soft leading-relaxed max-w-sm">
            반복되는 카톡 일정 조율, 이제 그만. 트레이너의 시간을 10배 빠르게 정리해드릴게요.
          </p>
          <div className="flex-1 grid place-items-center py-8">
            <img src={heroImg} alt="" width={320} height={320} className="h-64 w-64 lg:h-80 lg:w-80 object-contain" />
          </div>
        </aside>

        {/* RIGHT — auth methods (Kakao primary) */}
        <main className="bg-white flex flex-col px-8 pt-8 pb-10 lg:pt-16 lg:px-12">
          <div className="hidden lg:flex justify-end">
            <a href="https://pf.kakao.com" target="_blank" rel="noreferrer" className="h-9 px-3 rounded-xl border border-border text-[12px] font-bold text-ink hover:bg-muted">고객센터</a>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">로그인 / 회원가입</p>
            <h2 className="mt-3 text-[22px] font-black leading-tight">3초 만에 시작하기</h2>
            <p className="mt-2 text-[13px] text-ink-soft">카카오로 가장 빠르게 가입할 수 있어요.</p>

            <button
              onClick={startKakao}
              className="mt-6 h-14 rounded-2xl bg-[#FEE500] text-[#191600] text-[15px] font-extrabold inline-flex items-center justify-center gap-2 hover:brightness-95"
            >
              <MessageCircle className="h-4 w-4 fill-[#191600]" /> 카카오로 시작하기
            </button>

            <div className="mt-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-bold text-ink-soft">또는</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              onClick={startEmail}
              className="mt-5 h-12 rounded-2xl bg-white border border-border-strong text-ink text-[13.5px] font-bold inline-flex items-center justify-center gap-2 hover:bg-muted"
            >
              <Mail className="h-4 w-4" /> 이메일로 직접 가입
            </button>

            <p className="mt-6 text-[11.5px] text-ink-soft">
              가입 시 이름·프로필 사진·이메일을 카카오에서 받아옵니다.
            </p>
          </div>
        </main>
      </div>

      {/* Consent dialog — shown only after picking a method */}
      <Dialog open={consentOpen} onOpenChange={(v) => { setConsentOpen(v); if (!v) setError(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-black">잠깐, 약관에 동의해주세요</DialogTitle>
            <DialogDescription>가입을 진행하기 전, 필수 약관에 동의가 필요해요.</DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-border bg-surface-muted p-4">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox checked={agree.all} onChange={() => toggleAll(!agree.all)} />
              <span className="text-[14px] font-extrabold text-ink">전체 동의</span>
            </label>
            <div className="mt-3 grid gap-2 pl-1">
              <Row label="(필수) 만 14세 이상입니다" checked={agree.age} onChange={() => toggle("age")} />
              <Row label="(필수) 이용약관 동의" checked={agree.tos} onChange={() => toggle("tos")} link="#" />
              <Row label="(필수) 개인정보 수집·이용 동의" checked={agree.priv} onChange={() => toggle("priv")} link="#" />
            </div>
          </div>

          {error && <p className="text-[12px] text-destructive font-bold">{error}</p>}

          <button
            onClick={proceed}
            disabled={!allOk}
            className="h-12 rounded-2xl bg-ink text-white text-[14px] font-extrabold disabled:opacity-40"
          >
            동의하고 계속하기
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, checked, onChange, link }: { label: string; checked: boolean; onChange: () => void; link?: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <Checkbox checked={checked} onChange={onChange} />
      <span className="flex-1 text-[13px] text-ink-soft">{label}</span>
      {link && <a href={link} className="text-[11px] text-ink-soft underline">보기</a>}
    </label>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`h-5 w-5 rounded-md grid place-items-center transition shrink-0 ${checked ? "bg-primary text-white" : "bg-white border border-border-strong"}`}
      aria-pressed={checked}
    >
      {checked && <Check className="h-3.5 w-3.5" />}
    </button>
  );
}
