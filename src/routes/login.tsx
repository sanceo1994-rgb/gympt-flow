import { createFileRoute, Link } from "@tanstack/react-router";
import heroDumbbell from "@/assets/hero-dumbbell.png";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "로그인 — 짐피티 GymPT" }] }),
  component: Login,
});

function Login() {
  return (
    <div className="min-h-screen bg-surface grid lg:grid-cols-2">
      {/* Brand visual */}
      <div className="hidden lg:flex relative overflow-hidden bg-ink text-white p-10">
        <div className="absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-primary/40 blur-3xl" />
        <div className="absolute inset-0 bg-grid opacity-[0.08]" />
        <div className="relative flex flex-col h-full">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary grid place-items-center text-white font-black">G</div>
            <span className="font-extrabold tracking-tight">짐피티 GymPT</span>
          </Link>

          <div className="mt-auto">
            <img src={heroDumbbell} alt="" className="h-56 w-56 -ml-4" />
            <h1 className="mt-6 text-[40px] font-black leading-[1.05]">
              운동은 선생님이,<br /><span className="grad-pink-text">일정은 짐피티가.</span>
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

      {/* Form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-9 w-9 rounded-xl bg-primary grid place-items-center text-white font-black">G</div>
            <span className="font-extrabold text-ink">짐피티 GymPT</span>
          </Link>

          <h2 className="text-[28px] font-black text-ink">다시 만나서 반가워요</h2>
          <p className="mt-2 text-[14px] text-ink-soft">PT 일정 비서 짐피티에 로그인하세요.</p>

          <form className="mt-8 grid gap-3" onSubmit={(e) => e.preventDefault()}>
            <label className="text-[12px] font-bold text-ink-soft">이메일</label>
            <input type="email" placeholder="trainer@gympt.kr" className="h-12 px-4 rounded-2xl bg-card border border-border focus:border-primary outline-none text-[14px] font-semibold" />
            <label className="text-[12px] font-bold text-ink-soft mt-2">비밀번호</label>
            <input type="password" placeholder="••••••••" className="h-12 px-4 rounded-2xl bg-card border border-border focus:border-primary outline-none text-[14px] font-semibold" />

            <button className="mt-3 h-12 rounded-full bg-primary text-white font-bold shadow-pink inline-flex items-center justify-center gap-1">
              로그인 <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" className="h-12 rounded-full bg-card border border-border-strong text-ink font-bold">
              카카오로 계속하기
            </button>
          </form>

          <p className="mt-6 text-center text-[13px] text-ink-soft">
            처음이신가요?{" "}
            <Link to="/dashboard" className="text-primary font-bold hover:underline">무료 가입하기</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
