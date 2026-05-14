import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { setMyRole, getMyRole } from "@/lib/points.functions";
import { useAuth } from "@/hooks/use-auth";
import trainerImg from "@/assets/role-trainer.png";
import studentImg from "@/assets/role-student.png";

export const Route = createFileRoute("/onboarding/role")({
  head: () => ({ meta: [{ title: "역할 선택 — 픽짐피티 PickGymPT" }] }),
  component: RolePicker,
});

function RolePicker() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const fetchRole = useServerFn(getMyRole);
  const setRole = useServerFn(setMyRole);
  const [busy, setBusy] = useState<"trainer" | "student" | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    fetchRole().then((r) => {
      if (r.role === "trainer") navigate({ to: "/schedule" });
      else if (r.role === "student") navigate({ to: "/booking" });
    }).catch(() => {});
  }, [user, loading, navigate, fetchRole]);

  const pick = async (role: "trainer" | "student") => {
    setBusy(role);
    try {
      await setRole({ data: { role } });
      navigate({ to: role === "trainer" ? "/schedule" : "/booking" });
    } finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen bg-white text-ink flex flex-col">
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 pt-12 pb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">픽짐피티에 오신 걸 환영해요</p>
        <h1 className="mt-3 text-[28px] sm:text-[32px] font-black leading-[1.15] tracking-tight">
          어떤 역할로 시작할까요?
        </h1>
        <p className="mt-2 text-[14px] text-ink-soft">나중에 언제든 바꿀 수 있어요.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <RoleCard
            title="트레이너"
            sub="회원 일정 자동 조율"
            img={trainerImg}
            color="oklch(0.96 0.05 350)"
            disabled={!!busy}
            loading={busy === "trainer"}
            onClick={() => pick("trainer")}
          />
          <RoleCard
            title="학생 / 회원"
            sub="원하는 시간 선택하기"
            img={studentImg}
            color="oklch(0.96 0.04 220)"
            disabled={!!busy}
            loading={busy === "student"}
            onClick={() => pick("student")}
          />
        </div>
      </main>
    </div>
  );
}

function RoleCard({ title, sub, img, color, onClick, disabled, loading }: { title: string; sub: string; img: string; color: string; onClick: () => void; disabled: boolean; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative rounded-3xl border-2 border-border hover:border-ink p-6 text-left transition disabled:opacity-50 hover:-translate-y-0.5"
      style={{ background: color }}
    >
      <div className="aspect-square w-full grid place-items-center">
        <img src={img} alt="" width={256} height={256} className="h-44 w-44 object-contain drop-shadow-md" />
      </div>
      <h2 className="mt-2 text-[22px] font-black tracking-tight">{title}</h2>
      <p className="mt-1 text-[13px] text-ink-soft">{sub}</p>
      <span className="mt-4 inline-flex h-10 px-4 items-center rounded-full bg-ink text-white text-[12px] font-extrabold">
        {loading ? "이동 중..." : "이걸로 시작"}
      </span>
    </button>
  );
}
