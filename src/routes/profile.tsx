import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Check } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "내 정보 수정 — 픽짐피티" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const meta = (user?.user_metadata ?? {}) as { name?: string; avatar_url?: string; role?: string };
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("010-1234-5678");
  const [gym, setGym] = useState("하이엔드 피트니스 강남점");
  const [intro, setIntro] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(meta.name ?? "");
    setEmail(user?.email ?? "");
  }, [user]);

  const role = (meta.role as "trainer" | "student" | undefined) ?? "student";

  const save = () => {
    try {
      const cur = JSON.parse(localStorage.getItem("gympt-user") ?? "{}");
      localStorage.setItem("gympt-user", JSON.stringify({ ...cur, name, email }));
      window.dispatchEvent(new Event("gympt-auth"));
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppShell>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">계정</p>
        <h1 className="mt-1.5 text-[26px] sm:text-[30px] font-black text-ink leading-tight">내 정보 수정</h1>
        <p className="mt-2 text-[13.5px] text-ink-soft">이름, 연락처, 소개를 자유롭게 수정할 수 있어요.</p>
      </div>

      <div className="mt-6 grid lg:grid-cols-[280px_1fr] gap-4">
        {/* Avatar card */}
        <div className="rounded-2xl border border-border bg-white p-5 text-center">
          {meta.avatar_url ? (
            <img src={meta.avatar_url} alt="" className="h-24 w-24 rounded-2xl object-cover mx-auto ring-2 ring-border" />
          ) : (
            <div className="h-24 w-24 rounded-2xl bg-primary/15 grid place-items-center text-[32px] font-black text-primary mx-auto">{(name || "?")[0]}</div>
          )}
          <p className="mt-3 text-[15px] font-extrabold text-ink">{name || "이름 없음"}</p>
          <span className="mt-1 inline-flex items-center px-2.5 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold">{role === "trainer" ? "트레이너" : "학생/회원"}</span>
          <button className="mt-4 w-full h-10 rounded-xl bg-white border border-border-strong text-[12px] font-bold text-ink hover:bg-muted">사진 변경</button>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="이름" value={name} onChange={setName} />
            <Field label="이메일" value={email} onChange={setEmail} type="email" />
            <Field label="휴대폰" value={phone} onChange={setPhone} placeholder="010-0000-0000" />
            {role === "trainer" && <Field label="소속 헬스장" value={gym} onChange={setGym} />}
          </div>
          <div className="mt-4">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{role === "trainer" ? "트레이너 소개" : "한 줄 소개"}</span>
              <textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                rows={4}
                placeholder={role === "trainer" ? "전문 분야, 자격증, 운영 시간 등을 자유롭게 소개해주세요." : "운동 목표, 선호 시간 등을 적어주세요."}
                className="mt-1.5 w-full px-3.5 py-3 rounded-xl bg-surface-muted border border-border focus:bg-white focus:border-ink outline-none text-[13.5px] text-ink resize-none"
              />
            </label>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <button onClick={save} className="h-11 px-5 rounded-full bg-primary text-white text-[13px] font-extrabold inline-flex items-center gap-1.5 hover:brightness-110 shadow-pop">
              <Check className="h-4 w-4" /> 저장하기
            </button>
            {saved && <span className="text-[12px] font-bold text-primary">저장되었어요 ✓</span>}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{label}</span>
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
