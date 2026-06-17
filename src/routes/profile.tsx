import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Check, Pencil, CreditCard, Gift, Copy, Sparkles, CalendarClock, MessageSquare, Receipt, Zap, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "내 정보 — 픽짐피티" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const meta = (user?.user_metadata ?? {}) as { name?: string; avatar_url?: string; role?: string; verified?: boolean };
  const [role, setRole] = useState<"trainer" | "student">((meta.role as "trainer" | "student" | undefined) ?? "student");
  const isVerified = meta.verified !== false; // default true (first 100 trainers)

  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("010-1234-5678");
  const [gym, setGym] = useState("하이엔드 피트니스 강남점");
  const [intro, setIntro] = useState(role === "trainer" ? "8년차 퍼스널 트레이너. 평생 가져갈 운동 습관을 만들어드려요." : "");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Trainer-only mock state
  const inviteCode = "PGPT-" + (name || "JAEHYUN").slice(0, 4).toUpperCase() + "-7K2";
  const invitedCount = 3;
  const bonusWeeks = invitedCount; // 1주 per invite

  // Subscription / 알림톡
  const [planOpen, setPlanOpen] = useState(false);
  const [alimOpen, setAlimOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<"basic" | "pro" | "premium">("pro");
  const [alimUsed] = useState(387);
  const [alimTotal, setAlimTotal] = useState(600);
  const [historyToast, setHistoryToast] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);


  const PLANS = [
    { id: "basic" as const, name: "Basic", price: 19000, students: 20, alim: 300, perks: ["기본 일정 조율", "학생 20명까지"] },
    { id: "pro" as const, name: "Pro", price: 39000, students: 40, alim: 600, perks: ["인기 트레이너 노출", "학생 40명까지", "알림톡 600건"] },
    { id: "premium" as const, name: "Premium", price: 79000, students: 100, alim: 1500, perks: ["전담 매니저", "학생 100명까지", "알림톡 1,500건"] },
  ];
  const ALIM_PACKS = [
    { qty: 100, price: 5000 },
    { qty: 500, price: 19000, badge: "인기" },
    { qty: 1000, price: 35000, badge: "최대 할인" },
  ];
  const PAYMENTS = [
    { date: "2026.05.10", method: "신한카드 ****7821", item: "Pro 월 구독", amount: 39000 },
    { date: "2026.04.10", method: "신한카드 ****7821", item: "Pro 월 구독", amount: 39000 },
    { date: "2026.03.28", method: "신한카드 ****7821", item: "알림톡 500건 추가", amount: 19000 },
    { date: "2026.03.10", method: "신한카드 ****7821", item: "Pro 월 구독", amount: 39000 },
    { date: "2026.02.10", method: "신한카드 ****7821", item: "Basic 월 구독", amount: 19000 },
  ];
  const plan = PLANS.find((p) => p.id === currentPlan)!;

  useEffect(() => {
    setName(meta.name ?? "");
    setEmail(user?.email ?? "");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    let cancelled = false;

    async function loadProfile() {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (!cancelled && (roleRow?.role === "trainer" || roleRow?.role === "student")) {
        setRole(roleRow.role);
      }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("display_name,email")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (!cancelled && profileRow) {
        setName(profileRow.display_name ?? meta.name ?? "");
        setEmail(profileRow.email ?? currentUser.email ?? "");
      }

      const { data: trainerRow } = await supabase
        .from("trainers")
        .select("name,gym,intro")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (!cancelled && trainerRow) {
        setRole("trainer");
        setName(trainerRow.name ?? meta.name ?? "");
        setPhone("");
        setGym(trainerRow.gym ?? "");
        setIntro(trainerRow.intro ?? "");
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const save = async () => {
    try {
      if (user) {
        await supabase.auth.updateUser({ data: { name, full_name: name } });
        await supabase.from("profiles").update({ display_name: name, email }).eq("id", user.id);

        if (role === "trainer") {
          await supabase
            .from("trainers")
            .upsert({ user_id: user.id, name: name || "트레이너", gym: gym || null, intro: intro || null }, { onConflict: "user_id" });
        }
      } else {
        const cur = JSON.parse(localStorage.getItem("gympt-user") ?? "{}");
        localStorage.setItem("gympt-user", JSON.stringify({ ...cur, name, email }));
      }
      window.dispatchEvent(new Event("gympt-auth"));
    } catch {}
    setSaved(true);
    setEditMode(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const copyInvite = () => {
    try { navigator.clipboard.writeText(inviteCode); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">계정</p>
          <h1 className="mt-1.5 text-[26px] sm:text-[30px] font-black text-ink leading-tight">내 정보</h1>
          <p className="mt-2 text-[13.5px] text-ink-soft">기본 정보와 {role === "trainer" ? "결제·초대 내역" : "프로필"}을 한눈에 확인해요.</p>
        </div>
        {!editMode && (
          <button onClick={() => setEditMode(true)} className="h-10 px-4 rounded-full bg-ink text-white text-[12px] font-extrabold inline-flex items-center gap-1.5 hover:brightness-110">
            <Pencil className="h-3.5 w-3.5" /> 정보 수정
          </button>
        )}
      </div>

      <div className="mt-6 grid lg:grid-cols-[280px_1fr] gap-4">
        {/* Avatar card */}
        <div className="rounded-2xl border border-border bg-white p-5 text-center">
          <div className="relative inline-block">
            {meta.avatar_url ? (
              <img src={meta.avatar_url} alt="" className="h-24 w-24 rounded-2xl object-cover mx-auto ring-2 ring-border" />
            ) : (
              <div className="h-24 w-24 rounded-2xl bg-primary/15 grid place-items-center text-[32px] font-black text-primary mx-auto">{(name || "?")[0]}</div>
            )}
            {role === "trainer" && isVerified && <VerifiedBadge size={48} className="!-bottom-[12px] !-right-[12px]" />}
          </div>
          <p className="mt-3 text-[15px] font-extrabold text-ink">{name || "이름 없음"}</p>
          <span className="mt-1 inline-flex items-center px-2.5 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold">{role === "trainer" ? "트레이너" : "학생/회원"}</span>
          {editMode && <button className="mt-4 w-full h-10 rounded-xl bg-white border border-border-strong text-[12px] font-bold text-ink hover:bg-muted">사진 변경</button>}
        </div>

        {/* Info / Form */}
        <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="이름" value={name} onChange={setName} editable={editMode} />
            <Field label="이메일" value={email} onChange={setEmail} type="email" editable={editMode} />
            <Field label="휴대폰" value={phone} onChange={setPhone} placeholder="010-0000-0000" editable={editMode} />
            {role === "trainer" && <Field label="소속 헬스장" value={gym} onChange={setGym} editable={editMode} />}
          </div>
          <div className="mt-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{role === "trainer" ? "트레이너 소개" : "한 줄 소개"}</span>
            {editMode ? (
              <textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                rows={4}
                placeholder={role === "trainer" ? "전문 분야, 자격증, 운영 시간 등을 자유롭게 소개해주세요." : "운동 목표, 선호 시간 등을 적어주세요."}
                className="mt-1.5 w-full px-3.5 py-3 rounded-xl bg-surface-muted border border-border focus:bg-white focus:border-ink outline-none text-[13.5px] text-ink resize-none"
              />
            ) : (
              <p className="mt-1.5 text-[13.5px] text-ink leading-relaxed min-h-[60px]">{intro || <span className="text-ink-soft">소개가 아직 없어요.</span>}</p>
            )}
          </div>
          {editMode && (
            <div className="mt-6 flex items-center gap-2">
              <button onClick={save} className="h-11 px-5 rounded-full bg-primary text-white text-[13px] font-extrabold inline-flex items-center gap-1.5 hover:brightness-110 shadow-pop">
                <Check className="h-4 w-4" /> 저장하기
              </button>
              <button onClick={() => setEditMode(false)} className="h-11 px-4 rounded-full bg-white border border-border text-ink text-[13px] font-bold">취소</button>
              {saved && <span className="text-[12px] font-bold text-primary">저장되었어요 ✓</span>}
            </div>
          )}
        </div>
      </div>

      {/* Trainer-only sections */}
      {role === "trainer" && (
        <div className="mt-4 grid lg:grid-cols-2 gap-4">
          {/* Unified Subscription card (현재구독 + 알림톡 + 결제내역) */}
          <div className="rounded-2xl border border-border bg-white p-5 sm:p-6 lg:col-span-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-9 w-9 rounded-xl bg-ink text-white grid place-items-center shrink-0"><CreditCard className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">구독</p>
                  <h3 className="text-[16px] font-black text-ink leading-tight truncate">픽짐피티 {plan.name} · 월 {plan.price.toLocaleString()}원</h3>
                </div>
              </div>
              <span className="shrink-0 inline-flex items-center px-2 h-6 rounded-full bg-primary/10 text-primary text-[10.5px] font-extrabold">자동결제 · 신한 ****7821</span>
            </div>

            <div className="mt-5 grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-surface-muted border border-border p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-3">현재 구독</p>
                <ul className="space-y-2.5">
                  <BillingRow label="포함 한도" value={`학생 ${plan.students}명 · 알림톡 ${plan.alim.toLocaleString()}건`} />
                  <BillingRow label="다음 결제일" value="2026.06.10" />
                  <BillingRow label="누적 결제" value={`${PAYMENTS.reduce((s, p) => s + p.amount, 0).toLocaleString()}원`} />
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => setPlanOpen(true)} className="h-9 px-3 rounded-full bg-primary text-white text-[11.5px] font-extrabold hover:brightness-110">요금제 변경</button>
                  <button className="h-9 px-3 rounded-full bg-white border border-border-strong text-[11.5px] font-bold text-ink hover:bg-muted">결제 수단</button>
                  <button className="h-9 px-3 rounded-full bg-white border border-border text-[11.5px] font-bold text-ink-soft hover:text-ink hover:bg-muted">해지</button>
                </div>
              </div>

              <div className="rounded-xl bg-surface-muted border border-border p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-6 w-6 rounded-md bg-[#FEE500] text-[#191600] grid place-items-center"><MessageSquare className="h-3 w-3" /></span>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">알림톡 잔여량</p>
                  </div>
                  <button onClick={() => setAlimOpen(true)} className="h-7 px-2.5 rounded-full bg-ink text-white text-[10.5px] font-extrabold inline-flex items-center gap-1">
                    <Zap className="h-3 w-3" /> 충전
                  </button>
                </div>
                <p className="text-[20px] font-black text-ink leading-tight">{(alimTotal - alimUsed).toLocaleString()}<span className="text-[12px] text-ink-soft font-bold">건 남음</span></p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-ink-soft mb-1.5">
                    <span>이번 달 사용</span>
                    <span className="tabular-nums text-ink">{alimUsed.toLocaleString()} / {alimTotal.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white border border-border overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, (alimUsed / alimTotal) * 100)}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] text-ink-soft leading-relaxed">매월 1일 {plan.alim.toLocaleString()}건 자동 충전.</p>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <button
                onClick={() => setHistoryOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 h-10 px-3 rounded-xl bg-white border border-border hover:bg-muted transition"
              >
                <span className="inline-flex items-center gap-2 text-[12.5px] font-extrabold text-ink">
                  <Receipt className="h-4 w-4" /> 결제 내역 보기
                  <span className="text-[11px] font-bold text-ink-soft">({PAYMENTS.length}건)</span>
                </span>
                <span className={`text-ink-soft text-[11px] font-bold transition-transform ${historyOpen ? "rotate-180" : ""}`}>▾</span>
              </button>
              {historyOpen && (
                <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-white animate-in fade-in slide-in-from-top-1">
                  {PAYMENTS.map((p, i) => (
                    <li key={i} className="py-3 px-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-extrabold text-ink truncate">{p.item}</p>
                        <p className="text-[11.5px] text-ink-soft truncate">{p.date} · {p.method}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[14px] font-black text-ink tabular-nums">{p.amount.toLocaleString()}원</p>
                        <button className="text-[10.5px] text-ink-soft hover:text-ink underline underline-offset-2">영수증</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>


          {/* Invite */}
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-5 sm:p-6 lg:col-span-2">
            <div className="flex items-center gap-2">
              <span className="h-9 w-9 rounded-xl bg-primary text-white grid place-items-center"><Gift className="h-4 w-4" /></span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">트레이너 친구 초대</p>
                <h3 className="text-[16px] font-black text-ink leading-tight">초대할 때마다 <span className="text-primary">+1주 무료</span></h3>
              </div>
            </div>
            <p className="mt-3 text-[12.5px] text-ink-soft leading-relaxed">동료 트레이너가 내 코드로 가입하고 첫 일정을 만들면 두 분 모두 1주일 무료가 적립돼요.</p>

            <div className="mt-4 rounded-xl bg-white border border-border p-3 flex items-center gap-2">
              <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">내 초대 코드</span>
              <code className="flex-1 text-[14px] font-black text-ink tabular-nums truncate">{inviteCode}</code>
              <button onClick={copyInvite} className="h-9 px-3 rounded-lg bg-ink text-white text-[11px] font-extrabold inline-flex items-center gap-1">
                <Copy className="h-3 w-3" /> {copied ? "복사됨" : "복사"}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <StatBox icon={<Sparkles className="h-3.5 w-3.5" />} label="내가 초대한 사람" value={`${invitedCount}명`} />
              <StatBox icon={<CalendarClock className="h-3.5 w-3.5" />} label="받은 추가 시간" value={`+${bonusWeeks}주`} accent />
            </div>
          </div>
        </div>
      )}

      {/* Change plan dialog */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>요금제 변경</DialogTitle>
            <DialogDescription>언제든 업/다운그레이드 할 수 있어요. 변경분은 일할 계산돼 다음 결제에 반영돼요.</DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-3 gap-3 mt-2">
            {PLANS.map((p) => {
              const active = p.id === currentPlan;
              return (
                <button
                  key={p.id}
                  onClick={() => { setCurrentPlan(p.id); setAlimTotal(p.alim); setPlanOpen(false); setHistoryToast(`${p.name} 요금제로 변경되었어요`); setTimeout(() => setHistoryToast(null), 2200); }}
                  className={`text-left rounded-2xl border p-4 transition ${active ? "border-primary bg-primary/[0.04] ring-2 ring-primary/30" : "border-border bg-white hover:border-ink"}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-black text-ink">{p.name}</p>
                    {active && <span className="text-[10px] font-extrabold text-primary">현재</span>}
                  </div>
                  <p className="mt-2 text-[20px] font-black text-ink tabular-nums">{p.price.toLocaleString()}<span className="text-[12px] text-ink-soft font-bold">원/월</span></p>
                  <ul className="mt-3 space-y-1.5">
                    {p.perks.map((perk, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[12px] text-ink"><Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />{perk}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Alimtalk top-up dialog */}
      <Dialog open={alimOpen} onOpenChange={setAlimOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>알림톡 추가 구매</DialogTitle>
            <DialogDescription>구독 한도와 별개로 즉시 충전돼요. 사용 기한은 12개월.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 mt-2">
            {ALIM_PACKS.map((pack) => (
              <button
                key={pack.qty}
                onClick={() => { setAlimTotal((t) => t + pack.qty); setAlimOpen(false); setHistoryToast(`알림톡 ${pack.qty}건이 충전되었어요`); setTimeout(() => setHistoryToast(null), 2200); }}
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-white hover:border-ink p-4 transition"
              >
                <div className="text-left">
                  <p className="text-[14px] font-black text-ink flex items-center gap-2">
                    {pack.qty.toLocaleString()}건
                    {pack.badge && <span className="px-1.5 h-4 inline-flex items-center rounded-full bg-primary text-white text-[9.5px] font-extrabold">{pack.badge}</span>}
                  </p>
                  <p className="text-[11.5px] text-ink-soft mt-0.5">건당 {Math.round(pack.price / pack.qty)}원</p>
                </div>
                <p className="text-[16px] font-black text-ink tabular-nums">{pack.price.toLocaleString()}원</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {historyToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] bg-ink text-white text-[12.5px] font-bold px-4 h-11 rounded-full shadow-pop inline-flex items-center gap-2">
          <Check className="h-4 w-4 text-primary" /> {historyToast}
          <button onClick={() => setHistoryToast(null)} className="ml-1 opacity-70 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", editable }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; editable: boolean }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{label}</span>
      {editable ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-1.5 h-11 w-full px-3.5 rounded-xl bg-surface-muted border border-border focus:bg-white focus:border-ink outline-none text-[14px] font-semibold text-ink"
        />
      ) : (
        <p className="mt-1.5 h-11 px-3.5 rounded-xl bg-surface-muted border border-border flex items-center text-[14px] font-semibold text-ink">{value || <span className="text-ink-soft font-normal">—</span>}</p>
      )}
    </label>
  );
}

function BillingRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-2 text-[13px]">
      <span className="text-ink-soft">{label}</span>
      <span className="font-extrabold text-ink tabular-nums">{value}</span>
    </li>
  );
}

function StatBox({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${accent ? "bg-primary text-white" : "bg-white border border-border"}`}>
      <div className={`flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider ${accent ? "text-white/80" : "text-ink-soft"}`}>
        {icon}{label}
      </div>
      <p className={`mt-1 text-[20px] font-black tabular-nums ${accent ? "text-white" : "text-ink"}`}>{value}</p>
    </div>
  );
}
