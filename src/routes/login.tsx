import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, MessageCircle, Check } from "lucide-react";
import heroImg from "@/assets/login-hero.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "로그인 — 짐피티 GymPT" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const kakao = async () => {
    setError(null);
    if (!allOk) { setError("필수 항목에 모두 동의해주세요."); return; }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: window.location.origin + "/onboarding/role" },
    });
    if (error) setError("카카오 로그인 설정이 필요합니다. 운영자에게 문의해주세요.");
  };

  return (
    <div className="min-h-screen bg-white text-ink flex flex-col">
      {/* Top bar */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-border">
        <Link to="/" aria-label="뒤로" className="h-10 w-10 grid place-items-center rounded-full hover:bg-muted">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <a href="https://pf.kakao.com" target="_blank" rel="noreferrer" className="h-9 px-3 rounded-xl border border-border text-[12px] font-bold text-ink hover:bg-muted">고객센터</a>
      </header>

      <main className="flex-1 flex flex-col px-6 pt-8 pb-6 max-w-md w-full mx-auto">
        <h1 className="text-[28px] font-black leading-[1.2] tracking-tight">
          반복되는 일정 조율은<br />짐피티가 도와드릴게요
        </h1>

        <div className="flex-1 grid place-items-center py-8">
          <img src={heroImg} alt="" width={280} height={280} className="h-64 w-64 object-contain" />
        </div>

        {/* Consent */}
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

        {error && <p className="mt-3 text-[12px] text-destructive font-bold">{error}</p>}

        {/* CTA */}
        <button
          onClick={kakao}
          className="mt-4 h-14 rounded-2xl bg-[#FEE500] text-[#191600] text-[15px] font-extrabold inline-flex items-center justify-center gap-2 hover:brightness-95 disabled:opacity-50"
          disabled={!allOk}
        >
          <MessageCircle className="h-4 w-4 fill-[#191600]" /> 카카오로 3초만에 시작하기
        </button>
        <button
          onClick={() => allOk ? navigate({ to: "/signup-email" }) : setError("필수 항목에 모두 동의해주세요.")}
          className="mt-2 h-14 rounded-2xl bg-white border border-border-strong text-ink text-[14px] font-bold hover:bg-muted"
        >
          이메일로 직접 가입하기
        </button>

        <p className="mt-4 text-center text-[11.5px] text-ink-soft">
          가입 시 이름·프로필 사진·이메일을 카카오에서 받아옵니다.
        </p>
      </main>
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
