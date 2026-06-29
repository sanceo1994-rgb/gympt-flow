import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { annualPrice, SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";
import { Check, Sparkles } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "요금제 — 픽짐피티 PickGymPT" }] }),
  component: Pricing,
});

function Pricing() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const isAnnual = billing === "annual";

  return (
    <AppShell>
      <div className="text-center">
        <span className="chip">
          <Sparkles className="h-3 w-3" /> 요금제
        </span>
        <h1 className="mt-3 text-[30px] font-black leading-tight text-ink sm:text-[40px]">
          필요한 만큼만,
          <br />
          <span className="grad-pink-text">투명하게 확장하세요</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[14px] text-ink-soft">
          PT 중 학생 수와 알림톡 사용량에 맞춰 시작하고, 필요할 때 바로 다음 요금제로 이동할 수 있어요.
        </p>
      </div>

      <div className="sticky top-3 z-20 mx-auto mt-6 flex w-fit items-center rounded-full border border-border bg-white p-1 shadow-pop">
        <button
          onClick={() => setBilling("monthly")}
          className={`h-10 rounded-full px-5 text-[13px] font-black transition ${
            !isAnnual ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
          }`}
        >
          월구독
        </button>
        <button
          onClick={() => setBilling("annual")}
          className={`relative h-10 rounded-full px-5 text-[13px] font-black transition ${
            isAnnual ? "bg-primary text-white" : "text-ink-soft hover:text-ink"
          }`}
        >
          연구독
          <span className="absolute -right-4 -top-3 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-black text-ink">
            30%↓
          </span>
        </button>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const annual = annualPrice(plan.monthlyPrice);
          const displayPrice = isAnnual ? annual : plan.monthlyPrice;
          const monthlyEquivalent = Math.round(annual / 12);
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl p-6 ${
                plan.popular
                  ? "bg-ink text-white"
                  : plan.proBadge
                    ? "border-2 border-primary bg-card shadow-pink"
                    : "border border-border bg-card"
              }`}
            >
              {plan.popular && (
                <span className="chip absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white">
                  가장 인기
                </span>
              )}
              {plan.proBadge && (
                <span className="absolute -top-3 left-1/2 inline-flex h-7 -translate-x-1/2 items-center rounded-full bg-gradient-to-r from-primary to-[#FF6BA8] px-3 text-[11px] font-black text-white shadow-pink">
                  PRO 전용
                </span>
              )}
              <p className={`text-[13px] font-bold ${plan.popular ? "text-white/70" : "text-ink-soft"}`}>
                {plan.name}
              </p>
              <p className="mt-2">
                <span className={`text-[32px] font-black ${plan.popular ? "text-white" : "text-ink"}`}>
                  {displayPrice === 0 ? "무료" : `₩${displayPrice.toLocaleString()}`}
                </span>
                {displayPrice > 0 && (
                  <span className={`text-[13px] font-semibold ${plan.popular ? "text-white/60" : "text-muted-foreground"}`}>
                    /{isAnnual ? "년" : "월"}
                  </span>
                )}
              </p>
              {isAnnual && plan.monthlyPrice > 0 ? (
                <p className={`mt-1 text-[12px] font-bold ${plan.popular ? "text-white/75" : "text-primary"}`}>
                  <span className="mr-1 line-through opacity-60">
                    ₩{(plan.monthlyPrice * 12).toLocaleString()}
                  </span>
                  월 환산 ₩{monthlyEquivalent.toLocaleString()} · 30% 할인
                </p>
              ) : (
                <p className={`mt-1 text-[12px] ${plan.popular ? "text-white/70" : "text-muted-foreground"}`}>
                  언제든 다음 요금제로 변경 가능
                </p>
              )}

              <ul className={`mt-5 flex-1 space-y-2 text-[13px] ${plan.popular ? "text-white/90" : "text-ink-soft"}`}>
                <Li dark={plan.popular}>PT 중 학생 최대 {plan.activeStudentLimit}명</Li>
                <Li dark={plan.popular}>월 알림톡 {plan.monthlyAlimtalkLimit.toLocaleString()}건</Li>
                <Li dark={plan.popular}>
                  {plan.extraPurchaseEnabled
                    ? `추가 알림톡 100건당 ${plan.extraAlimtalk100Price?.toLocaleString()}원`
                    : "추가 알림톡 구매 불가"}
                </Li>
                <Li dark={plan.popular}>예약 링크 무제한</Li>
              </ul>

              <Link
                to="/checkout"
                search={{ plan: plan.id, billing }}
                className={`mt-6 inline-flex h-11 items-center justify-center rounded-full text-[13px] font-bold ${
                  plan.popular
                    ? "bg-primary text-white"
                    : plan.proBadge
                      ? "bg-gradient-to-r from-primary to-[#FF6BA8] text-white shadow-pink"
                      : plan.monthlyPrice === 0
                        ? "border border-border-strong bg-card text-ink"
                        : "bg-ink text-white"
                }`}
              >
                {plan.monthlyPrice === 0 ? "무료로 시작하기" : `${plan.name} 구독하기`}
              </Link>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function Li({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? "text-white" : "text-primary"}`} />
      <span>{children}</span>
    </li>
  );
}
