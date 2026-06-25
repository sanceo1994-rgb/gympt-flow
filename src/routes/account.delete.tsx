import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertTriangle, ArrowLeft, Check, LoaderCircle, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { deleteMyAccount } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/account/delete")({
  head: () => ({ meta: [{ title: "회원 탈퇴 — 픽짐피티" }] }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const { user, loading } = useAuth();
  const deleteAccount = useServerFn(deleteMyAccount);
  const [understood, setUnderstood] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canDelete = understood && confirmation === "탈퇴합니다" && !busy;

  const handleDelete = async () => {
    if (!canDelete) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      await deleteAccount({ data: { confirmation: "탈퇴합니다" } });
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      localStorage.removeItem("gympt-user");
      localStorage.removeItem("gympt-users");
      sessionStorage.clear();
      window.location.replace("/");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "회원 탈퇴를 처리하지 못했습니다.");
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="grid min-h-screen place-items-center"><LoaderCircle className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md py-20 text-center">
          <h1 className="text-[22px] font-black text-ink">로그인이 필요합니다</h1>
          <Link to="/login" className="mt-5 inline-flex h-11 items-center rounded-full bg-primary px-5 text-[13px] font-extrabold text-white">로그인하기</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-xl py-4 sm:py-10">
        <Link to="/profile" className="inline-flex items-center gap-1 text-[12px] font-bold text-ink-soft hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> 내 정보로 돌아가기
        </Link>

        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-white">
          <div className="border-b border-border px-5 py-6 sm:px-7">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-[24px] font-black text-ink">회원 탈퇴</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
              탈퇴하면 픽짐피티 계정과 연결된 일정 정보를 다시 복구할 수 없습니다.
            </p>
          </div>

          <div className="space-y-5 px-5 py-6 sm:px-7">
            <div className="rounded-xl bg-destructive/[0.05] p-4">
              <div className="flex items-center gap-2 text-[12px] font-extrabold text-destructive">
                <AlertTriangle className="h-4 w-4" /> 탈퇴 전 확인해주세요
              </div>
              <ul className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-ink">
                <li>계정과 프로필 정보가 영구 삭제됩니다.</li>
                <li>연결된 PT 일정과 회원·트레이너 관계가 삭제됩니다.</li>
                <li>현재 구독 중인 상품이 있다면 먼저 해지와 환불 상태를 확인해야 합니다.</li>
              </ul>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3.5">
              <input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#FF008C]" />
              <span className="text-[12.5px] font-semibold leading-relaxed text-ink">삭제되는 정보와 복구할 수 없다는 내용을 확인했습니다.</span>
            </label>

            <label className="block">
              <span className="text-[11px] font-bold text-ink-soft">확인을 위해 ‘탈퇴합니다’를 입력해주세요.</span>
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="탈퇴합니다"
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface-muted px-3.5 text-[13px] font-bold outline-none focus:border-ink focus:bg-white"
              />
            </label>

            {errorMessage && <p className="text-[12px] font-bold text-destructive">{errorMessage}</p>}

            <div className="flex gap-2 pt-1">
              <Link to="/profile" className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-border-strong text-[13px] font-bold text-ink">취소</Link>
              <button
                onClick={handleDelete}
                disabled={!canDelete}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive text-[13px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                영구 탈퇴
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
