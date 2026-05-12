import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup-email")({
  head: () => ({ meta: [{ title: "이메일로 가입 — 짐피티 GymPT" }] }),
  component: SignupEmail,
});

function SignupEmail() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password: pw,
          options: { data: { name }, emailRedirectTo: window.location.origin + "/onboarding/role" },
        });
        if (error) throw error;
        navigate({ to: "/onboarding/role" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        navigate({ to: "/onboarding/role" });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류가 발생했어요");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-white text-ink flex flex-col">
      <header className="px-4 py-3 flex items-center border-b border-border">
        <Link to="/login" className="h-10 w-10 grid place-items-center rounded-full hover:bg-muted"><ChevronLeft className="h-5 w-5" /></Link>
      </header>
      <main className="flex-1 max-w-md w-full mx-auto px-6 pt-8 pb-6">
        <h1 className="text-[26px] font-black leading-tight tracking-tight">
          {mode === "signup" ? "이메일로 가입할게요" : "이메일로 로그인"}
        </h1>
        <p className="mt-2 text-[13px] text-ink-soft">필요한 것만 빠르게 입력해주세요.</p>

        <div className="mt-6 grid gap-2.5">
          {mode === "signup" && (
            <div>
              <label className="text-[11px] font-bold text-ink-soft">이름</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" className="mt-1 h-12 w-full px-4 rounded-xl bg-surface-muted border border-border focus:border-primary outline-none text-[14px] font-semibold" />
            </div>
          )}
          <div>
            <label className="text-[11px] font-bold text-ink-soft">이메일</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gympt.kr" className="mt-1 h-12 w-full px-4 rounded-xl bg-surface-muted border border-border focus:border-primary outline-none text-[14px] font-semibold" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-ink-soft">비밀번호</label>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="6자 이상" className="mt-1 h-12 w-full px-4 rounded-xl bg-surface-muted border border-border focus:border-primary outline-none text-[14px] font-semibold" />
          </div>
        </div>

        {err && <p className="mt-3 text-[12px] text-destructive font-bold">{err}</p>}

        <button onClick={submit} disabled={busy || !email || !pw || (mode === "signup" && !name)} className="mt-5 h-14 w-full rounded-2xl bg-primary text-white text-[15px] font-extrabold disabled:opacity-50">
          {busy ? "처리 중..." : mode === "signup" ? "가입하고 시작하기" : "로그인"}
        </button>

        <p className="mt-4 text-center text-[12px] text-ink-soft">
          {mode === "signup" ? "이미 계정이 있나요? " : "처음이신가요? "}
          <button onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="text-primary font-bold hover:underline">
            {mode === "signup" ? "로그인" : "회원가입"}
          </button>
        </p>
      </main>
    </div>
  );
}
