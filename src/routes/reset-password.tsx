import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Lock, LoaderCircle, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "비밀번호 재설정 — 픽짐피티" }] }),
  component: ResetPassword,
});

function pwStrong(pw: string): boolean {
  return pw.length >= 8 && /[a-zA-Z]/.test(pw) && /\d/.test(pw) && /[^a-zA-Z0-9]/.test(pw);
}

function ResetPassword() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      const queryParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const providerError =
        queryParams.get("error_description") ||
        queryParams.get("error") ||
        hashParams.get("error_description") ||
        hashParams.get("error");
      if (providerError) {
        if (!cancelled) {
          setLinkError("재설정 링크가 만료되었거나 이미 사용되었습니다. 다시 요청해주세요.");
          setChecking(false);
        }
        return;
      }

      // supabase-js parses the recovery link's hash/query and establishes a
      // session during client init; getSession() awaits that before returning.
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error || !data.session) {
        setLinkError("재설정 링크가 유효하지 않습니다. 로그인 화면에서 다시 요청해주세요.");
        setChecking(false);
        return;
      }
      setSessionReady(true);
      setChecking(false);
    }
    void checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    setSubmitErr(null);
    if (!pwStrong(pw)) {
      setSubmitErr("8자 이상, 영문/숫자/특수문자를 모두 포함해주세요.");
      return;
    }
    if (pw !== confirm) {
      setSubmitErr("비밀번호가 일치하지 않습니다.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) {
        setSubmitErr("비밀번호 변경에 실패했습니다. 다시 시도해주세요.");
        return;
      }
      setDone(true);
      setTimeout(() => navigate({ to: "/profile", replace: true }), 1200);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-5">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-7 text-center shadow-sm">
        {checking ? (
          <>
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-primary" />
            <h1 className="mt-4 text-[19px] font-black text-ink">링크를 확인하고 있어요</h1>
            <p className="mt-2 text-[12.5px] text-ink-soft">잠시만 기다려주세요.</p>
          </>
        ) : linkError ? (
          <>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
              <TriangleAlert className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-[19px] font-black text-ink">링크를 사용할 수 없어요</h1>
            <p className="mt-2 break-words text-[12.5px] leading-relaxed text-ink-soft">{linkError}</p>
            <button
              onClick={() => navigate({ to: "/login", replace: true })}
              className="mt-5 h-11 w-full rounded-xl bg-ink text-[13px] font-extrabold text-white"
            >
              로그인으로 돌아가기
            </button>
          </>
        ) : done ? (
          <>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Check className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-[19px] font-black text-ink">비밀번호가 변경되었어요</h1>
            <p className="mt-2 text-[12.5px] text-ink-soft">내 정보로 이동하고 있어요.</p>
          </>
        ) : sessionReady ? (
          <>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-[19px] font-black text-ink">새 비밀번호 설정</h1>
            <p className="mt-2 text-[12.5px] text-ink-soft">새로 사용할 비밀번호를 입력해주세요.</p>

            <div className="mt-5 space-y-3 text-left">
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  value={pw}
                  onChange={(e) => { setPw(e.target.value); setSubmitErr(null); }}
                  placeholder="영문+숫자+특수문자, 8자 이상"
                  className="mt-1.5 h-12 w-full rounded-xl border border-border bg-surface-muted px-3.5 text-[14px] font-bold text-ink outline-none focus:border-ink focus:bg-white"
                />
                {pw.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <PwRule ok={pw.length >= 8} label="8자 이상" />
                    <PwRule ok={/[a-zA-Z]/.test(pw)} label="영문" />
                    <PwRule ok={/\d/.test(pw)} label="숫자" />
                    <PwRule ok={/[^a-zA-Z0-9]/.test(pw)} label="특수문자" />
                  </div>
                )}
              </div>
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setSubmitErr(null); }}
                  placeholder="한 번 더 입력해주세요"
                  className="mt-1.5 h-12 w-full rounded-xl border border-border bg-surface-muted px-3.5 text-[14px] font-bold text-ink outline-none focus:border-ink focus:bg-white"
                />
                {confirm.length > 0 && (
                  pw === confirm ? (
                    <p className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-bold text-emerald-600">
                      <Check className="h-3.5 w-3.5" /> 비밀번호가 일치해요
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[11.5px] font-bold text-destructive">
                      비밀번호가 일치하지 않아요
                    </p>
                  )
                )}
              </div>
            </div>

            {submitErr && (
              <p className="mt-3 text-[12px] font-bold text-destructive">{submitErr}</p>
            )}

            <button
              onClick={submit}
              disabled={busy || !pw || !confirm}
              className="mt-5 h-12 w-full rounded-xl bg-primary text-[14px] font-extrabold text-white disabled:opacity-40"
            >
              {busy ? "변경 중..." : "비밀번호 변경하기"}
            </button>
          </>
        ) : null}
      </div>
    </main>
  );
}

function PwRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 rounded-full px-2 text-[10.5px] font-bold ${
        ok ? "bg-primary/10 text-primary" : "bg-surface-muted text-ink-soft"
      }`}
    >
      {ok && <Check className="h-3 w-3" />} {label}
    </span>
  );
}
