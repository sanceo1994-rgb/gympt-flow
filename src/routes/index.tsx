import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ArrowRight, Check, Sparkles, Zap, Star } from "lucide-react";
import heroDumbbell from "@/assets/hero-dumbbell.png";
import iconCalendar from "@/assets/icon-calendar.png";
import iconChat from "@/assets/icon-chat.png";
import stepOpen from "@/assets/step-open.png";
import stepPick from "@/assets/step-pick.png";
import stepAi from "@/assets/step-ai.png";
import { Badge } from "@/components/Badge";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "픽짐피티 PickGymPT — PT 트레이너 일정 비서" },
      { name: "description", content: "PT 일정 조율을 카톡으로 하나씩? 픽짐피티가 학생 선호 시간을 모아 AI 최적 시간표를 만들어드려요." },
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
          <Reveal variant="fade-up"><span className="chip"><Sparkles className="h-3 w-3" /> AI 일정 비서 · 베타 오픈</span></Reveal>
          <h1 className="mt-4 text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.05] font-black text-ink text-balance">
            <Reveal variant="fade-up" delay={80} as="span" className="block">PT 일정 조율,</Reveal>
            <Reveal variant="fade-up" delay={200} as="span" className="block">아직도 <span className="grad-pink-text">카톡으로</span></Reveal>
            <Reveal variant="fade-up" delay={320} as="span" className="block">하나씩 맞추세요?</Reveal>
          </h1>
          <Reveal variant="fade-up" delay={440}>
            <p className="mt-5 text-[15px] sm:text-[16px] text-ink-soft leading-relaxed text-pretty max-w-lg">
              학생은 원하는 시간을 고르고, 선생님은 가장 많은 수업이 가능한 시간표를 받습니다.
              <br />선착순이 아니라, <b className="text-ink">모두에게 더 잘 맞는</b> 시간표.
            </p>
          </Reveal>
          <Reveal variant="fade-up" delay={560}>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/login"
                className="inline-flex h-12 items-center px-6 rounded-full bg-primary text-white text-[14px] font-bold shadow-pink hover:brightness-110 transition-transform hover:-translate-y-0.5"
              >
                무료로 시작하기 <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-bold text-ink-soft mr-1">로그인 없이 미리 체험:</span>
              <Link
                to="/demo/student"
                className="inline-flex h-10 items-center px-4 rounded-full bg-card border border-border-strong text-ink text-[12.5px] font-bold hover:bg-muted hover:-translate-y-0.5 transition-transform"
              >
                🧑‍🎓 학생 화면 체험
              </Link>
              <Link
                to="/demo/trainer"
                className="inline-flex h-10 items-center px-4 rounded-full bg-card border border-border-strong text-ink text-[12.5px] font-bold hover:bg-muted hover:-translate-y-0.5 transition-transform"
              >
                💪 트레이너 화면 체험
              </Link>
            </div>
          </Reveal>
          <Reveal variant="fade" delay={720}>
            <div className="mt-6 flex items-center gap-4 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-primary" /> 카드등록 없이 시작</span>
              <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-primary" /> 학생 3명 무료</span>
              <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-primary" /> 1분이면 셋업</span>
            </div>
          </Reveal>
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-grid opacity-[0.5] rounded-3xl pointer-events-none" />
          <div className="relative grid grid-cols-2 gap-3">
            <Reveal variant="scale" delay={120} className="col-span-2">
              <div className="panel p-5 flex items-center gap-4">
                <img src={heroDumbbell} alt="PickGymPT" className="h-24 w-24 -my-2" width={1024} height={1024} />
                <div>
                  <p className="text-[11px] font-bold text-primary uppercase tracking-wider">이번 주 결과</p>
                  <p className="text-[22px] font-black text-ink leading-tight">학생 14명 중<br />13명 시간 확정</p>
                  <p className="text-[12px] text-muted-foreground mt-1">평균 1순위 매칭 92%</p>
                </div>
              </div>
            </Reveal>
            <Reveal variant="scale" delay={240}>
              <div className="panel p-4">
                <img src={iconCalendar} alt="" className="h-9 w-9" loading="lazy" />
                <p className="mt-2 text-[12px] text-ink-soft">총 슬롯</p>
                <p className="text-[20px] font-extrabold text-ink">38</p>
              </div>
            </Reveal>
            <Reveal variant="scale" delay={340}>
              <div className="panel p-4">
                <img src={iconChat} alt="" className="h-9 w-9" loading="lazy" />
                <p className="mt-2 text-[12px] text-ink-soft">알림 발송</p>
                <p className="text-[20px] font-extrabold text-ink">126</p>
              </div>
            </Reveal>
            <Reveal variant="scale" delay={440} className="col-span-2">
              <div className="panel p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-ink-soft uppercase">슬롯 점유율</p>
                  <p className="text-[10px] font-bold text-primary">평균 62%</p>
                </div>
                <div className="mt-2 grid grid-cols-7 gap-1.5 items-end h-16">
                  {[
                    { d: "월", v: 40 },
                    { d: "화", v: 70 },
                    { d: "수", v: 55 },
                    { d: "목", v: 95 },
                    { d: "금", v: 80 },
                    { d: "토", v: 35 },
                    { d: "일", v: 60 },
                  ].map(({ d, v }, i) => (
                    <div key={d} className="flex flex-col items-center justify-end gap-1 h-full">
                      <span className="text-[9px] font-extrabold tabular-nums text-ink-soft">{v}%</span>
                      <div className="w-full rounded-md bg-primary/15 relative overflow-hidden" style={{ height: "100%" }}>
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary to-[#FF6FB1] rounded-md"
                          style={{ height: `${v}%`, transition: `height 900ms cubic-bezier(0.22,1,0.36,1) ${500 + i * 90}ms` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 grid grid-cols-7 gap-1.5 text-[10px] text-muted-foreground font-semibold text-center">
                  <span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span><span>일</span>
                </div>
              </div>
            </Reveal>
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
    { n: "01", title: "선생님이 다음 주 가능 시간을 엽니다", desc: "요일·시간·정원만 입력하면 학생용 예약 링크가 즉시 생성돼요.", img: stepOpen },
    { n: "02", title: "학생들이 원하는 시간을 선택합니다", desc: "원하는 만큼 골라요. 모바일에서 3초면 끝나요.", img: stepPick },
    { n: "03", title: "픽짐피티가 최적 시간표를 추천합니다", desc: "아무도 빠지지 않게, 모두가 PT 받을 수 있는 시간표를 자동으로 만들어요.", img: stepAi },
  ];
  return (
    <section className="mt-14">
      <Reveal variant="fade-up"><SectionHead eyebrow="작동 방식" title="3단계로 끝나는 다음 주 일정" /></Reveal>
      <div className="mt-6 grid md:grid-cols-3 gap-3">
        {steps.map((s, i) => (
          <Reveal key={s.n} variant="fade-up" delay={i * 130}>
            <div className="panel p-6 relative overflow-hidden h-full transition-transform hover:-translate-y-1">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-black text-primary tracking-widest">{s.n}</span>
                <img src={s.img} alt="" loading="lazy" width={512} height={512} className="h-20 w-20 -mt-2 -mr-2 object-contain drop-shadow-md" />
              </div>
              <h3 className="mt-1 text-[17px] font-extrabold text-ink leading-snug">{s.title}</h3>
              <p className="mt-2 text-[13px] text-ink-soft leading-relaxed">{s.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Benefits() {
  return (
    <section className="mt-14 grid md:grid-cols-2 gap-3">
      <Reveal variant="slide-left">
        <div className="rounded-2xl bg-ink text-white p-7 relative overflow-hidden h-full">
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
      </Reveal>
      <Reveal variant="slide-right" delay={120}>
        <div className="rounded-2xl bg-card border border-border p-7 relative overflow-hidden h-full">
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
      </Reveal>
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
      <Reveal variant="fade-up">
        <div className="flex items-center gap-2">
          <span className="chip"><Zap className="h-3 w-3" /> 핵심 기술</span>
          <span className="text-[12px] text-muted-foreground">아무도 빠지지 않게 · 모두가 PT</span>
        </div>
      </Reveal>
      <h3 className="mt-3 text-[26px] font-black text-ink leading-tight">
        <Reveal variant="fade-up" delay={100} as="span" className="block">한 명도 놓치지 않는</Reveal>
        <Reveal variant="fade-up" delay={220} as="span" className="block"><span className="grad-pink-text">모두를 위한</span> 시간표</Reveal>
      </h3>
      <Reveal variant="fade-up" delay={340}>
        <p className="mt-3 text-[14px] text-ink-soft leading-relaxed max-w-2xl">
          픽짐피티는 누가 더 빨랐는지를 보지 않아요. 모든 학생의 가능 시간을 한꺼번에 맞춰서,
          <b className="text-ink"> 한 명이라도 더 PT를 받을 수 있는</b> 조합을 찾아드려요.
          붐비는 시간은 정원만큼만, 비어있던 시간은 자연스럽게 채우면서요.
        </p>
      </Reveal>
      <div className="mt-6 grid sm:grid-cols-3 gap-3">
        {[
          { k: "전원 배정", v: "최우선 목표", hi: true, desc: "한 명이라도 빠지면 다시 계산" },
          { k: "정원 보호", v: "혼잡 방지", desc: "트레이너님 페이스를 지켜요" },
          { k: "빈 시간 활용", v: "유연 분산", desc: "비어있던 슬롯을 자연스럽게 채워요" },
        ].map((r, i) => (
          <Reveal key={i} variant="scale" delay={120 + i * 100}>
            <div className={`rounded-xl p-4 h-full ${r.hi ? "bg-primary text-white" : "bg-surface-muted"}`}>
              <p className={`text-[11px] font-bold uppercase ${r.hi ? "text-white/80" : "text-ink-soft"}`}>{r.k}</p>
              <p className={`mt-1 text-[18px] font-black ${r.hi ? "text-white" : "text-ink"}`}>{r.v}</p>
              <p className={`mt-1 text-[11.5px] ${r.hi ? "text-white/80" : "text-ink-soft"} leading-relaxed`}>{r.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function MockPreview() {
  return (
    <section className="mt-14">
      <Reveal variant="fade-up"><SectionHead eyebrow="실제 화면" title="이렇게 생긴 픽짐피티" /></Reveal>
      <div className="mt-6 grid md:grid-cols-2 gap-3">
        <Reveal variant="slide-left">
          <div className="panel p-5 h-full">
            <p className="text-[11px] font-bold text-primary uppercase">트레이너 화면</p>
            <p className="mt-1 font-extrabold text-ink">이번 주 학생 응답</p>
            <div className="mt-3 space-y-2">
              {[
                ["김지원", "응답완료", "primary"],
                ["박서윤", "확정완료", "ink"],
                ["이도현", "응답대기", "muted"],
                ["최유나", "응답완료", "primary"],
              ].map(([n, s, c], i) => (
                <Reveal key={i} variant={i % 2 === 0 ? "slide-left" : "slide-right"} delay={150 + i * 110}>
                  <div className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-card grid place-items-center font-black text-[11px] text-ink">{(n as string)[0]}</div>
                      <span className="font-semibold text-ink text-[13px]">{n}</span>
                    </div>
                    <Badge tone={c as any}>{s}</Badge>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal variant="slide-right" delay={120}>
          <div className="panel p-5 h-full">
            <p className="text-[11px] font-bold text-primary uppercase">학생 예약 화면</p>
            <p className="mt-1 font-extrabold text-ink">원하는 시간을 골라보세요</p>
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
              {["월", "화", "수", "목", "금", "토"].map((d, i) => (
                <button key={i} className={`shrink-0 px-3 h-9 rounded-full text-[13px] font-bold transition-transform hover:-translate-y-0.5 ${i === 1 ? "bg-ink text-white" : "bg-surface-muted text-ink-soft"}`}>{d}</button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                ["07:00", "여유"],
                ["09:00", "추천", true],
                ["12:00", "혼잡"],
                ["19:00", "혼잡"],
              ].map(([t, l, hi], i) => (
                <Reveal key={i} variant="scale" delay={250 + i * 120}>
                  <button className={`w-full rounded-xl px-3 py-3 text-left border transition-transform hover:-translate-y-0.5 ${hi ? "border-primary bg-primary-soft" : "border-border bg-card"}`}>
                    <p className="font-extrabold text-ink">{t}</p>
                    <p className={`text-[11px] font-bold mt-0.5 ${l === "혼잡" ? "text-primary" : "text-ink-soft"}`}>{l}</p>
                  </button>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
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
      <Reveal variant="fade-up"><SectionHead eyebrow="요금제" title="딱 필요한 만큼만" actionLabel="전체 요금제" actionTo="/pricing" /></Reveal>
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {plans.map((p, i) => (
          <Reveal key={p.name} variant="fade-up" delay={i * 110}>
            <div className={`relative rounded-2xl p-5 h-full transition-transform hover:-translate-y-1 ${p.hot ? "bg-ink text-white" : "bg-card border border-border"}`}>
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
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function ReferralCard() {
  return (
    <Reveal variant="scale" as="section" className="mt-14 rounded-3xl bg-gradient-to-br from-primary to-[#FF6BA8] text-white p-8 sm:p-10 relative overflow-hidden">
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
          <button className="mt-5 inline-flex h-12 items-center px-6 rounded-full bg-white text-primary text-[14px] font-bold transition-transform hover:-translate-y-0.5">
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
    </Reveal>
  );
}

function FinalCTA() {
  return (
    <section className="mt-14 text-center py-10 border-t border-border">
      <h3 className="text-[28px] sm:text-[34px] font-black text-ink leading-tight">
        <Reveal variant="fade-up" as="span" className="block">운동은 선생님이,</Reveal>
        <Reveal variant="fade-up" delay={140} as="span" className="block"><span className="grad-pink-text">일정은 픽짐피티가.</span></Reveal>
      </h3>
      <Reveal variant="fade-up" delay={280}>
        <div className="mt-5 flex justify-center gap-3 flex-wrap">
          <Link to="/schedule" className="inline-flex h-12 items-center px-6 rounded-full bg-primary text-white font-bold shadow-pink transition-transform hover:-translate-y-0.5">
            무료로 시작하기
          </Link>
          <Link to="/pricing" className="inline-flex h-12 items-center px-6 rounded-full bg-card border border-border-strong text-ink font-bold transition-transform hover:-translate-y-0.5">
            요금제 비교하기
          </Link>
        </div>
      </Reveal>
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

