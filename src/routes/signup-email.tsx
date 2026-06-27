import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowUp,
  Check,
  ChevronLeft,
  Lock,
  Mail,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneNumber } from "@/lib/phone";

export const Route = createFileRoute("/signup-email")({
  head: () => ({ meta: [{ title: "이메일 회원가입 - PickGymPT" }] }),
  component: SignupEmail,
});

type Mode = "signup" | "login";
type FieldKey = "name" | "phone" | "email" | "password";

type StepConfig = {
  key: FieldKey;
  label: string;
  question: string;
  placeholder: string;
  type?: string;
  inputMode?: "email" | "numeric" | "text";
  icon: typeof UserRound;
};

const SIGNUP_STEPS: StepConfig[] = [
  {
    key: "name",
    label: "이름",
    question: "어떻게 불러드릴까요?",
    placeholder: "홍길동",
    icon: UserRound,
  },
  {
    key: "phone",
    label: "전화번호",
    question: "연락받을 번호를 입력해주세요",
    placeholder: "010-0000-0000",
    inputMode: "numeric",
    icon: Phone,
  },
  {
    key: "email",
    label: "이메일",
    question: "로그인에 쓸 이메일은요?",
    placeholder: "you@gympt.kr",
    type: "email",
    inputMode: "email",
    icon: Mail,
  },
  {
    key: "password",
    label: "비밀번호",
    question: "비밀번호를 정해주세요",
    placeholder: "6자 이상",
    type: "password",
    icon: Lock,
  },
];

const LOGIN_STEPS: StepConfig[] = [
  SIGNUP_STEPS[2],
  SIGNUP_STEPS[3],
];

function SignupEmail() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signup");
  const [activeKey, setActiveKey] = useState<FieldKey>("name");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const steps = mode === "signup" ? SIGNUP_STEPS : LOGIN_STEPS;
  const values: Record<FieldKey, string> = {
    name,
    phone,
    email,
    password: pw,
  };
  const activeIndex = Math.max(0, steps.findIndex((step) => step.key === activeKey));
  const activeStep = steps[activeIndex] ?? steps[0];
  const completedSteps = steps.filter((step) => isValid(step.key, values[step.key]));
  const progress = Math.round((completedSteps.length / steps.length) * 100);
  const canContinue = isValid(activeStep.key, values[activeStep.key]);
  const canSubmit = steps.every((step) => isValid(step.key, values[step.key]));

  const helperText = useMemo(() => {
    if (activeStep.key === "phone") return "숫자만 입력해도 자동으로 정리돼요.";
    if (activeStep.key === "password") return mode === "signup" ? "6자 이상이면 바로 시작할 수 있어요." : "가입할 때 사용한 비밀번호를 입력해주세요.";
    if (activeStep.key === "email") return "수업 일정 알림과 로그인에 사용됩니다.";
    return "나중에 내 정보에서 언제든 바꿀 수 있어요.";
  }, [activeStep.key, mode]);

  const updateValue = (key: FieldKey, value: string) => {
    setErr(null);
    if (key === "name") setName(value);
    if (key === "phone") setPhone(formatPhoneNumber(value));
    if (key === "email") setEmail(value.trim());
    if (key === "password") setPw(value);
  };

  const moveNext = () => {
    if (!canContinue) return;
    const next = steps[activeIndex + 1];
    if (next) setActiveKey(next.key);
    else void submit();
  };

  const switchMode = () => {
    const nextMode: Mode = mode === "signup" ? "login" : "signup";
    setMode(nextMode);
    setActiveKey(nextMode === "signup" ? "name" : "email");
    setErr(null);
  };

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setErr(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password: pw,
          options: {
            data: { name, phone: formatPhoneNumber(phone) },
            emailRedirectTo: window.location.origin + "/",
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  };

  const ActiveIcon = activeStep.icon;

  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white/95 px-3 py-2 backdrop-blur">
        <Link to="/login" className="grid h-10 w-10 place-items-center rounded-full hover:bg-muted">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <button onClick={switchMode} className="h-10 rounded-full px-3 text-[12px] font-extrabold text-primary">
          {mode === "signup" ? "로그인" : "가입"}
        </button>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-57px)] w-full max-w-md flex-col px-5 pb-5 pt-5">
        <section className="shrink-0">
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 text-[11px] font-extrabold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {mode === "signup" ? "빠른 회원가입" : "이메일 로그인"}
          </span>
          <h1 className="mt-3 text-[27px] font-black leading-tight tracking-tight">
            한 번에 하나씩,
            <br />
            확인하면서 입력해요
          </h1>
        </section>

        <section className="mt-5 grid gap-2.5">
          {steps.map((step) => {
            const value = values[step.key];
            const done = isValid(step.key, value);
            const Icon = step.icon;
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => setActiveKey(step.key)}
                className={`flex min-h-14 items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition ${
                  activeKey === step.key
                    ? "border-primary bg-primary/[0.04]"
                    : done
                      ? "border-border bg-white"
                      : "border-transparent bg-surface-muted/70"
                }`}
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${done ? "bg-primary text-white" : "bg-white text-ink-soft"}`}>
                  {done ? <Check className="h-4 w-4" strokeWidth={3.5} /> : <Icon className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-extrabold text-ink-soft">{step.label}</span>
                  <span className={`mt-0.5 block truncate text-[14px] font-black ${done ? "text-ink" : "text-ink-soft"}`}>
                    {done ? maskValue(step.key, value) : "아직 입력 전"}
                  </span>
                </span>
              </button>
            );
          })}
        </section>

        <section className="mt-auto pt-5">
          <div className="rounded-[28px] border border-border bg-ink p-4 text-white shadow-pop">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-primary">
                <ActiveIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-extrabold text-white/55">{activeStep.label}</p>
                <p className="mt-1 text-[20px] font-black leading-tight">{activeStep.question}</p>
              </div>
            </div>

            <input
              autoFocus
              type={activeStep.type ?? "text"}
              inputMode={activeStep.inputMode}
              value={values[activeStep.key]}
              onChange={(e) => updateValue(activeStep.key, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") moveNext();
              }}
              placeholder={activeStep.placeholder}
              className="mt-5 h-14 w-full rounded-2xl border border-white/10 bg-white px-4 text-[18px] font-black text-ink outline-none placeholder:text-ink-soft/45 focus:ring-4 focus:ring-primary/30"
            />
            <p className="mt-2 text-[12px] font-semibold text-white/55">{helperText}</p>

            {err && <p className="mt-3 rounded-xl bg-destructive/15 px-3 py-2 text-[12px] font-bold text-red-100">{err}</p>}

            <button
              onClick={moveNext}
              disabled={busy || !canContinue}
              className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-extrabold text-white shadow-pink transition active:scale-[0.99] disabled:opacity-45"
            >
              {busy ? (
                "처리 중..."
              ) : activeIndex === steps.length - 1 ? (
                mode === "signup" ? "가입하고 시작하기" : "로그인"
              ) : (
                <>
                  다음
                  <ArrowUp className="h-4 w-4 rotate-90" />
                </>
              )}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function isValid(key: FieldKey, value: string) {
  const trimmed = value.trim();
  if (key === "name") return trimmed.length >= 2;
  if (key === "phone") return trimmed.replace(/\D/g, "").length === 11;
  if (key === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  if (key === "password") return value.length >= 6;
  return false;
}

function maskValue(key: FieldKey, value: string) {
  if (key === "password") return "비밀번호 입력 완료";
  return value;
}
