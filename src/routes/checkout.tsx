import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { annualPrice, planById } from "@/lib/subscription-plans";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Check, CreditCard } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>) => ({
    plan: typeof search.plan === "string" ? search.plan : "free",
    billing: search.billing === "annual" ? "annual" : "monthly",
  }),
  head: () => ({ meta: [{ title: "결제하기 — 픽짐피티 PickGymPT" }] }),
  component: Checkout,
});

function Checkout() {
  const { plan: planId, billing } = Route.useSearch();
  const { user } = useAuth();
  const [paid, setPaid] = useState(false);
  const plan = planById(planId);
  const isAnnual = billing === "annual";
  const amount = isAnnual ? annualPrice(plan.monthlyPrice) : plan.monthlyPrice;
  const billingEmail = user?.email ?? "";
  const { paymentDate, nextPaymentDate } = useMemo(() => {
    const now = new Date();
    const next = new Date(now);
    if (isAnnual) next.setFullYear(next.getFullYear() + 1);
    else next.setMonth(next.getMonth() + 1);
    return {
      paymentDate: formatDate(now),
      nextPaymentDate: formatDate(next),
    };
  }, [isAnnual]);

  return (
    <AppShell>
      <Link to="/pricing" className="inline-flex items-center gap-1 text-[12px] font-bold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> 요금제로 돌아가기
      </Link>

      <div className="mx-auto mt-8 max-w-2xl">
        <div className="rounded-3xl border border-border bg-white p-6 shadow-pop sm:p-8">
          <span className="inline-flex h-9 items-center gap-2 rounded-full bg-primary/10 px-3 text-[12px] font-black text-primary">
            <CreditCard className="h-4 w-4" /> 결제하기
          </span>
          <h1 className="mt-4 text-[28px] font-black leading-tight text-ink">
            픽짐피티 {plan.name} {isAnnual ? "연구독" : "월구독"}
          </h1>
          <p className="mt-2 text-[13px] text-ink-soft">
            포트원 결제 연동 전까지는 가상 결제로 플로우만 확인합니다.
          </p>

          <div className="mt-6 grid gap-3 rounded-2xl bg-surface-muted p-4">
            <Row label="상품" value={`PickGymPT ${plan.name} ${isAnnual ? "연구독" : "월구독"}`} />
            <Row label="청구금액" value={amount === 0 ? "0원" : `${amount.toLocaleString()}원`} strong />
            <Row label="결제일" value={paymentDate} />
            <Row label="다음 결제일" value={amount === 0 ? "-" : nextPaymentDate} />
            <Row label="청구 이메일 주소" value={billingEmail || "로그인 이메일 확인 필요"} />
          </div>

          {paid ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-[13px] font-bold text-emerald-700">
              <Check className="mr-1 inline h-4 w-4" />
              가상 결제가 완료되었어요. 실제 결제 모듈은 포트원 연결 시 이 단계에 붙이면 됩니다.
            </div>
          ) : null}

          <button
            onClick={() => setPaid(true)}
            className="mt-6 h-12 w-full rounded-2xl bg-ink text-[14px] font-extrabold text-white shadow-pop hover:brightness-110"
          >
            다음
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
      <span className="text-[12px] font-bold text-ink-soft">{label}</span>
      <span className={`text-right text-[13px] ${strong ? "font-black text-primary" : "font-bold text-ink"}`}>
        {value}
      </span>
    </div>
  );
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}
