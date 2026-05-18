import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, MessageCircle, Check, Mail, ArrowRight, Sparkles, Plus, X } from "lucide-react";
import heroDumbbell from "@/assets/hero-dumbbell.png";
import trainerImg from "@/assets/role-trainer.png";
import studentImg from "@/assets/role-student.png";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "로그인 — 픽짐피티 PickGymPT" }] }),
  component: Login,
});

type Step = "method" | "consent" | "role" | "confirm" | "done";
type Role = "trainer" | "student";

const KAKAO_MOCK = {
  name: "박재현",
  email: "jaehyun.park@kakao.com",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jaehyun&backgroundColor=ffd5dc",
};

const PALETTES: { id: string; label: string; from: string; to: string }[] = [
  { id: "pink", label: "픽짐 핑크", from: "#FF4E97", to: "#FF6FB1" },
  { id: "navy", label: "딥 네이비", from: "#0F172A", to: "#3B82F6" },
  { id: "forest", label: "포레스트", from: "#064E3B", to: "#10B981" },
  { id: "sunset", label: "선셋", from: "#F97316", to: "#E11D48" },
  { id: "violet", label: "바이올렛", from: "#6D28D9", to: "#C084FC" },
];

function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<"kakao" | "email">("kakao");
  const [agree, setAgree] = useState({ tos: false, priv: false, age: false });
  const [role, setRole] = useState<Role | null>(null);
  const [profile, setProfile] = useState({ name: "", email: "", avatar: "" });
  const [emailPw, setEmailPw] = useState({ email: "", password: "", confirm: "" });
  const [inviteCode, setInviteCode] = useState("");
  // Trainer mini-hompy customization
  const [palette, setPalette] = useState<string>("pink");
  const [trainerGym, setTrainerGym] = useState("");
  const [trainerSpecs, setTrainerSpecs] = useState<string[]>([]);
  const [specDraft, setSpecDraft] = useState("");
  const [trainerIntro, setTrainerIntro] = useState("");
  const [welcome, setWelcome] = useState<string | null>(null);

  const allOk = agree.tos && agree.priv && agree.age;
  const toggleAll = (v: boolean) => setAgree({ tos: v, priv: v, age: v });

  const startMethod = (m: "kakao" | "email") => { setMethod(m); setStep("consent"); };

  const afterConsent = () => {
    if (method === "kakao") setProfile(KAKAO_MOCK);
    else setProfile({ name: "", email: emailPw.email, avatar: "" });
    setStep("role");
  };

  const completeSignup = () => {
    const user = { ...profile, role };
    try {
      localStorage.setItem("gympt-user", JSON.stringify(user));
      window.dispatchEvent(new Event("gympt-auth"));
    } catch {}
    setWelcome(profile.name || "회원");
    setTimeout(() => {
      setWelcome(null);
      navigate({ to: role === "student" ? "/booking" : "/schedule" });
    }, 1600);
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
        <Link to="/" className="lg:hidden flex items-center gap-2 mb-4 self-start">
          <div className="h-8 w-8 rounded-xl bg-primary grid place-items-center text-white font-black text-[13px]">G</div>
          <span className="font-extrabold text-ink text-[14px]">픽짐피티 PickGymPT</span>
        </Link>
        {step !== "method" && step !== "done" && (
          <button
            onClick={() => setStep(step === "consent" ? "method" : step === "role" ? "consent" : "role")}
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
                <p className="mt-2 text-[13px] text-ink-soft">카카오로 가장 빠르게 가입할 수 있어요.</p>

                <button
                  onClick={() => startMethod("kakao")}
                  className="mt-6 h-14 w-full rounded-2xl bg-[#FEE500] text-[#191600] text-[15px] font-extrabold inline-flex items-center justify-center gap-2 hover:brightness-95"
                >
                  <MessageCircle className="h-4 w-4 fill-[#191600]" /> 카카오로 시작하기
                </button>

                <div className="mt-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[11px] font-bold text-ink-soft">또는</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <button
                  onClick={() => startMethod("email")}
                  className="mt-5 h-12 w-full rounded-2xl bg-white border border-border-strong text-ink text-[13.5px] font-bold inline-flex items-center justify-center gap-2 hover:bg-muted"
                >
                  <Mail className="h-4 w-4" /> 이메일로 직접 가입
                </button>

                <p className="mt-6 text-[11.5px] text-ink-soft">가입 시 카카오에서 이름·프로필·이메일을 불러옵니다.</p>
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
                  <RoleCard title="학생 / 회원" sub="원하는 시간 선택" img={studentImg} active={role === "student"} onClick={() => setRole("student")} />
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
                <h2 className="text-[22px] font-black leading-tight">가입 정보를 확인해주세요</h2>
                <p className="mt-2 text-[13px] text-ink-soft">
                  {method === "kakao" ? "카카오에서 받아온 정보예요. 필요하면 수정할 수 있어요." : "기본 정보를 입력해주세요."}
                </p>

                <div className="mt-5 flex items-center gap-3">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="" className="h-16 w-16 rounded-2xl bg-muted object-cover ring-2 ring-border" />
                  ) : (
                    <div className="h-16 w-16 rounded-2xl bg-surface-muted grid place-items-center text-[22px] font-black text-ink ring-2 ring-border">
                      {profile.name?.[0] || "?"}
                    </div>
                  )}
                  <span className="chip bg-primary/10 text-primary">{role === "trainer" ? "트레이너" : "학생 / 회원"}</span>
                </div>

                <div className="mt-5 grid gap-3">
                  <Field label="이름" value={profile.name} onChange={(v) => setProfile((p) => ({ ...p, name: v }))} placeholder="홍길동" />
                  <Field label="이메일" type="email" value={profile.email} onChange={(v) => setProfile((p) => ({ ...p, email: v }))} placeholder="you@example.com" />
                  {method === "email" && (
                    <>
                      <Field label="비밀번호" type="password" value={emailPw.password} onChange={(v) => setEmailPw((p) => ({ ...p, password: v }))} placeholder="8자 이상" />
                      <Field label="비밀번호 확인" type="password" value={emailPw.confirm} onChange={(v) => setEmailPw((p) => ({ ...p, confirm: v }))} placeholder="다시 한 번 입력" />
                      {emailPw.password && emailPw.confirm && emailPw.password !== emailPw.confirm && (
                        <p className="text-[11px] text-destructive font-bold">비밀번호가 일치하지 않아요</p>
                      )}
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
                          rows={3}
                          placeholder="평생 가져갈 운동 습관을 만들어드려요. 부상 없는 점진적 과부하 전문."
                          className="mt-1.5 w-full px-3.5 py-3 rounded-xl bg-surface-muted border border-border focus:bg-white focus:border-ink outline-none text-[13.5px] text-ink resize-none"
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
                  onClick={completeSignup}
                  disabled={!profile.name || !profile.email || (method === "email" && (!emailPw.password || emailPw.password !== emailPw.confirm))}
                  className="mt-6 h-12 w-full rounded-2xl bg-primary text-white text-[14px] font-extrabold disabled:opacity-40 inline-flex items-center justify-center gap-2 shadow-pop"
                >
                  <Check className="h-4 w-4" /> 회원가입 완료
                </button>
                <p className="mt-3 text-center text-[11px] text-ink-soft">DB 연결은 추후 적용됩니다 — 지금은 가상 회원가입으로 진행돼요.</p>
              </div>
            )}
          </div>
      </main>

      {/* Welcome floating toast */}
      <Dialog open={!!welcome} onOpenChange={(v) => !v && setWelcome(null)}>
        <DialogContent className="max-w-sm border-0 p-0 bg-transparent shadow-none">
          <div className="rounded-3xl bg-white shadow-pop border border-border p-6 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/15 grid place-items-center mb-3">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-[22px] font-black tracking-tight text-ink">환영합니다, {welcome}님!</h3>
            <p className="mt-1.5 text-[13px] text-ink-soft">픽짐피티가 일정 조율을 도와드릴게요.</p>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const order: Step[] = ["consent", "role", "confirm"];
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
      <div className="aspect-square w-full grid place-items-center">
        <img src={img} alt="" className="h-24 w-24 object-contain drop-shadow-md" />
      </div>
      <h3 className="mt-1 text-[15px] font-black tracking-tight">{title}</h3>
      <p className="mt-0.5 text-[11.5px] text-ink-soft">{sub}</p>
      <span className={`absolute top-3 right-3 h-5 w-5 rounded-full grid place-items-center transition ${active ? "bg-primary text-white" : "bg-muted text-transparent"}`}>
        <Check className="h-3 w-3" />
      </span>
    </button>
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
