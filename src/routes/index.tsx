import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ArrowRight, Check, Sparkles, Zap, Star } from "lucide-react";
import heroDumbbell from "@/assets/hero-dumbbell.png";
import iconCalendar from "@/assets/icon-calendar.png";
import iconChat from "@/assets/icon-chat.png";
import { Badge } from "@/components/Badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "짐피티 GymPT — PT 트레이너 일정 비서" },
      { name: "description", content: "PT 일정 조율을 카톡으로 하나씩? 짐피티가 학생 선호 시간을 모아 AI 최적 시간표를 만들어드려요." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <AppShell>
      <Hero />
      <SocialBar />
      <HowItWorks />
      <Benefits />
      <AISection />
      <MockPreview />
      <PricingPreview />
      <ReferralCard />
      <FinalCTA />
    </AppShell>
  );
}

function Hero() {
  return (
    <section className="relative">
      <div className="absolute -top-6 -right-6 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-8 items-center">
        <div>
          <span className="chip"><Sparkles className="h-3 w-3" /> AI 일정 비서 · 베타 오픈</span>
          <h1 className="mt-4 text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.05] font-black text-ink text-balance">
            PT 일정 조율,<br />
            아직도 <span className="grad-pink-text">카톡으로</span><br />
            하나씩 맞추세요?
          </h1>
          <p className="mt-5 text-[15px] sm:text-[16px] text-ink-soft leading-relaxed text-pretty max-w-lg">
            학생은 원하는 시간을 고르고, 선생님은 가장 많은 수업이 가능한 시간표를 받습니다.
            <br />선착순이 아니라, <b className="text-ink">모두에게 더 잘 맞는</b> 시간표.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex h-12 items-center px-6 rounded-full bg-primary text-white text-[14px] font-bold shadow-pink hover:brightness-110"
            >
              무료로 시작하기 <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
            <Link
              to="/booking"
              className="inline-flex h-12 items-center px-6 rounded-full bg-card border border-border-strong text-ink text-[14px] font-bold hover:bg-muted"
            >
              학생 예약 화면 보기
            </Link>
          </div>
          <div className="mt-6 flex items-center gap-4 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-primary" /> 카드등록 없이 시작</span>
            <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-primary" /> 학생 3명 무료</span>
            <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-primary" /> 1분이면 셋업</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-grid opacity-[0.5] rounded-3xl pointer-events-none" />
          <div className="relative grid grid-cols-2 gap-3">
            <div className="col-span-2 panel p-5 flex items-center gap-4">
              <img src={heroDumbbell} alt="GymPT" className="h-24 w-24 -my-2" width={1024} height={1024} />
              <div>
                <p className="text-[11px] font-bold text-primary uppercase tracking-wider">이번 주 결과</p>
                <p className="text-[22px] font-black text-ink leading-tight">학생 14명 중<br />13명 시간 확정</p>
                <p className="text-[12px] text-muted-foreground mt-1">평균 1순위 매칭 92%</p>
              </div>
            </div>
            <div className="panel p-4">
              <img src={iconCalendar} alt="" className="h-9 w-9" loading="lazy" />
              <p className="mt-2 text-[12px] text-ink-soft">총 슬롯</p>
              <p className="text-[20px] font-extrabold text-ink">38</p>
            </div>
            <div className="panel p-4">
              <img src={iconChat} alt="" className="h-9 w-9" loading="lazy" />
              <p className="mt-2 text-[12px] text-ink-soft">알림 발송</p>
              <p className="text-[20px] font-extrabold text-ink">126</p>
            </div>
            <div className="col-span-2 panel p-4">
              <p className="text-[11px] font-bold text-ink-soft uppercase">슬롯 점유율</p>
              <div className="mt-2 flex items-end gap-1.5 h-14">
                {[40, 70, 55, 95, 80, 35, 60].map((v, i) => (
                  <div key={i} className="flex-1 rounded-md bg-primary/15 relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 right-0 bg-primary rounded-md" style={{ height: `${v}%` }} />
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground font-semibold">
                <span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span><span>일</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SocialBar() {
  return (
    <div className="mt-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-5 border-y border-border bg-surface-muted/60">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-[12px] font-bold text-ink-soft">이미 사용 중인 트레이너 1,200명+</p>
        <div className="flex items-center gap-5 text-muted-foreground text-[13px] font-bold opacity-80">
          <span>스포애니</span><span>·</span><span>짐박스</span><span>·</span><span>바디스튜디오</span><span>·</span><span>코어짐</span><span>·</span><span>핏필</span>
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "선생님이 다음 주 가능 시간을 엽니다", desc: "요일·시간·정원만 입력하면 학생용 예약 링크가 즉시 생성돼요." },
    { n: "02", title: "학생들이 원하는 시간을 선택합니다", desc: "1·2·3순위까지 골라요. 모바일에서 3초면 끝나요." },
    { n: "03", title: "짐피티가 최적 시간표를 추천합니다", desc: "모든 학생의 만족도가 가장 높은 시간표를 자동 계산해 드려요." },
  ];
  return (
    <section className="mt-14">
      <SectionHead eyebrow="작동 방식" title="3단계로 끝나는 다음 주 일정" />
      <div className="mt-6 grid md:grid-cols-3 gap-3">
        {steps.map((s) => (
          <div key={s.n} className="panel p-6 relative">
            <span className="text-[11px] font-black text-primary tracking-widest">{s.n}</span>
            <h3 className="mt-2 text-[17px] font-extrabold text-ink leading-snug">{s.title}</h3>
            <p className="mt-2 text-[13px] text-ink-soft leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Benefits() {
  return (
    <section className="mt-14 grid md:grid-cols-2 gap-3">
      <div className="rounded-2xl bg-ink text-white p-7 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 h-44 w-44 rounded-full bg-primary/40 blur-3xl" />
        <span className="pill-dark bg-white/10">트레이너용</span>
        <h3 className="mt-3 text-[24px] font-black leading-tight">
          매주 2시간씩<br />아끼는 시간표 비서
        </h3>
        <ul className="mt-5 space-y-2.5 text-[13px] text-white/85">
          <Bullet>카톡으로 하나씩 묻지 않아도 돼요</Bullet>
          <Bullet>응답 안 한 학생은 자동으로 표시</Bullet>
          <Bullet>알림톡 일괄 발송 + 재전송</Bullet>
          <Bullet>AI가 1순위 매칭률을 최대로</Bullet>
        </ul>
      </div>
      <div className="rounded-2xl bg-card border border-border p-7 relative overflow-hidden">
        <div className="absolute -left-10 -top-10 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
        <span className="chip">학생용</span>
        <h3 className="mt-3 text-[24px] font-black leading-tight text-ink">
          원하는 시간 3개만<br />고르면 끝
        </h3>
        <ul className="mt-5 space-y-2.5 text-[13px] text-ink-soft">
          <Bullet color>가입 없이 링크로 바로 선택</Bullet>
          <Bullet color>1·2·3순위로 표현 가능</Bullet>
          <Bullet color>혼잡한 시간대를 미리 확인</Bullet>
          <Bullet color>확정 후 카톡으로 알림</Bullet>
        </ul>
      </div>
    </section>
  );
}

function Bullet({ children, color = false }: { children: React.ReactNode; color?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <Check className={`mt-0.5 h-4 w-4 ${color ? "text-primary" : "text-primary"}`} />
      <span>{children}</span>
    </li>
  );
}

function AISection() {
  return (
    <section className="mt-14 panel p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <span className="chip"><Zap className="h-3 w-3" /> 핵심 기술</span>
        <span className="text-[12px] text-muted-foreground">선착순 ❌ · 만족도 최적화 ✅</span>
      </div>
      <h3 className="mt-3 text-[26px] font-black text-ink leading-tight">
        선착순이 아니라,<br />
        <span className="grad-pink-text">모두에게 더 잘 맞는</span> 시간표
      </h3>
      <p className="mt-3 text-[14px] text-ink-soft leading-relaxed max-w-2xl">
        짐피티는 학생의 1·2·3순위를 점수로 환산해, 정원을 넘기지 않으면서
        가장 많은 학생을 1순위에 배정하는 시간표를 계산해요.
      </p>
      <div className="mt-6 grid sm:grid-cols-4 gap-3">
        {[
          ["1순위", "+100점"],
          ["2순위", "+70점"],
          ["3순위", "+40점"],
          ["미배정", "−1000점"],
        ].map(([k, v], i) => (
          <div key={i} className={`rounded-xl p-4 ${i === 0 ? "bg-primary text-white" : "bg-surface-muted"}`}>
            <p className={`text-[11px] font-bold uppercase ${i === 0 ? "text-white/80" : "text-ink-soft"}`}>{k}</p>
            <p className={`mt-1 text-[20px] font-black ${i === 0 ? "text-white" : "text-ink"}`}>{v}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MockPreview() {
  return (
    <section className="mt-14">
      <SectionHead eyebrow="실제 화면" title="이렇게 생긴 짐피티" />
      <div className="mt-6 grid md:grid-cols-2 gap-3">
        <div className="panel p-5">
          <p className="text-[11px] font-bold text-primary uppercase">트레이너 화면</p>
          <p className="mt-1 font-extrabold text-ink">이번 주 학생 응답</p>
          <div className="mt-3 space-y-2">
            {[
              ["김지원", "응답완료", "primary"],
              ["박서윤", "확정완료", "ink"],
              ["이도현", "응답대기", "muted"],
              ["최유나", "응답완료", "primary"],
            ].map(([n, s, c], i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-card grid place-items-center font-black text-[11px] text-ink">{(n as string)[0]}</div>
                  <span className="font-semibold text-ink text-[13px]">{n}</span>
                </div>
                <Badge tone={c as any}>{s}</Badge>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <p className="text-[11px] font-bold text-primary uppercase">학생 예약 화면</p>
          <p className="mt-1 font-extrabold text-ink">원하는 시간을 골라보세요</p>
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {["월", "화", "수", "목", "금", "토"].map((d, i) => (
              <button key={i} className={`shrink-0 px-3 h-9 rounded-full text-[13px] font-bold ${i === 1 ? "bg-ink text-white" : "bg-surface-muted text-ink-soft"}`}>{d}</button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              ["07:00", "여유"],
              ["09:00", "추천", true],
              ["12:00", "혼잡"],
              ["19:00", "혼잡"],
            ].map(([t, l, hi], i) => (
              <button key={i} className={`rounded-xl px-3 py-3 text-left border ${hi ? "border-primary bg-primary-soft" : "border-border bg-card"}`}>
                <p className="font-extrabold text-ink">{t}</p>
                <p className={`text-[11px] font-bold mt-0.5 ${l === "혼잡" ? "text-primary" : "text-ink-soft"}`}>{l}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingPreview() {
  const plans = [
    { name: "Free", price: "0", students: 3, msgs: 30 },
    { name: "Mini", price: "5,900", students: 7, msgs: 100 },
    { name: "Basic", price: "9,900", students: 15, msgs: 220, hot: true },
    { name: "Pro", price: "19,900", students: 40, msgs: 600 },
  ];
  return (
    <section className="mt-14">
      <SectionHead eyebrow="요금제" title="딱 필요한 만큼만" actionLabel="전체 요금제" actionTo="/pricing" />
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {plans.map((p) => (
          <div key={p.name} className={`relative rounded-2xl p-5 ${p.hot ? "bg-ink text-white" : "bg-card border border-border"}`}>
            {p.hot && <span className="absolute -top-2 right-4 chip bg-primary text-white">인기</span>}
            <p className={`text-[12px] font-bold ${p.hot ? "text-white/70" : "text-ink-soft"}`}>{p.name}</p>
            <p className="mt-2 text-[24px] font-black">
              {p.price === "0" ? "무료" : <>₩{p.price}<span className={`text-[12px] font-semibold ${p.hot ? "text-white/60" : "text-muted-foreground"}`}>/월</span></>}
            </p>
            <ul className={`mt-3 space-y-1.5 text-[13px] ${p.hot ? "text-white/85" : "text-ink-soft"}`}>
              <li>학생 {p.students}명</li>
              <li>알림 {p.msgs}건/월</li>
              <li>AI 최적 시간표</li>
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReferralCard() {
  return (
    <section className="mt-14 rounded-3xl bg-gradient-to-br from-primary to-[#FF6BA8] text-white p-8 sm:p-10 relative overflow-hidden">
      <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/20 blur-3xl" />
      <div className="grid md:grid-cols-[1.5fr,1fr] gap-6 items-center">
        <div>
          <span className="pill-dark bg-white/15">동료쌤 초대</span>
          <h3 className="mt-3 text-[28px] sm:text-[32px] font-black leading-tight">
            동료쌤을 초대하면<br />Basic 14일을 함께 무료로
          </h3>
          <p className="mt-3 text-white/85 text-[14px] max-w-md">
            초대한 쌤이 첫 일정을 만들면 두 분 모두 14일 무료. 첫 결제 시 1개월 무료 + 초대받은 쌤 50% 할인.
          </p>
          <button className="mt-5 inline-flex h-12 items-center px-6 rounded-full bg-white text-primary text-[14px] font-bold">
            동료쌤 초대하기 <ArrowRight className="ml-1 h-4 w-4" />
          </button>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/20">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-white/80">팀 보너스</span>
            <Star className="h-4 w-4" />
          </div>
          <p className="mt-2 text-[18px] font-extrabold leading-snug">
            같은 헬스장 트레이너 3명이 가입하면 Team Starter 체험 자동 오픈
          </p>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="mt-14 text-center py-10 border-t border-border">
      <h3 className="text-[28px] sm:text-[34px] font-black text-ink leading-tight">
        운동은 선생님이,<br />
        <span className="grad-pink-text">일정은 짐피티가.</span>
      </h3>
      <div className="mt-5 flex justify-center gap-3 flex-wrap">
        <Link to="/dashboard" className="inline-flex h-12 items-center px-6 rounded-full bg-primary text-white font-bold shadow-pink">
          무료로 시작하기
        </Link>
        <Link to="/pricing" className="inline-flex h-12 items-center px-6 rounded-full bg-card border border-border-strong text-ink font-bold">
          요금제 비교하기
        </Link>
      </div>
    </section>
  );
}

function SectionHead({ eyebrow, title, actionLabel, actionTo }: { eyebrow: string; title: string; actionLabel?: string; actionTo?: string }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <p className="text-[11px] font-black text-primary uppercase tracking-widest">{eyebrow}</p>
        <h2 className="mt-1 text-[24px] sm:text-[28px] font-black text-ink leading-tight">{title}</h2>
      </div>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="text-[13px] font-bold text-ink-soft hover:text-primary">{actionLabel} →</Link>
      )}
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "primary" | "ink" | "muted" | "warn" }) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    ink: "bg-ink text-white",
    muted: "bg-muted text-ink-soft",
    warn: "bg-warning/15 text-warning",
  };
  return <span className={`inline-flex items-center px-2.5 h-6 rounded-full text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}

export { Badge };
