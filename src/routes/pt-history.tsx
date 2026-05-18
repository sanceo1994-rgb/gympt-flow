import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Calendar, Award, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/pt-history")({
  head: () => ({ meta: [{ title: "내 PT 내역 — 픽짐피티" }] }),
  component: PTHistory,
});

const HISTORY = [
  { date: "26.05.12 (화)", time: "19:00", trainer: "박재현", gym: "하이엔드 강남점", status: "완료", note: "하체 + 코어" },
  { date: "26.05.09 (토)", time: "11:00", trainer: "박재현", gym: "하이엔드 강남점", status: "완료", note: "상체 (어깨/팔)" },
  { date: "26.05.07 (목)", time: "07:00", trainer: "박재현", gym: "하이엔드 강남점", status: "완료", note: "유산소 + 복근" },
  { date: "26.05.05 (화)", time: "19:00", trainer: "박재현", gym: "하이엔드 강남점", status: "취소", note: "회원 사정" },
  { date: "26.05.02 (토)", time: "10:00", trainer: "박재현", gym: "하이엔드 강남점", status: "완료", note: "데드리프트 폼 교정" },
  { date: "26.04.30 (목)", time: "19:00", trainer: "박재현", gym: "하이엔드 강남점", status: "완료", note: "하체 + 코어" },
  { date: "26.04.27 (월)", time: "20:00", trainer: "박재현", gym: "하이엔드 강남점", status: "완료", note: "상체 (가슴/등)" },
];

function PTHistory() {
  const completed = HISTORY.filter((h) => h.status === "완료").length;
  return (
    <AppShell>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">내 정보</p>
        <h1 className="mt-1.5 text-[26px] sm:text-[30px] font-black text-ink leading-tight">PT 내역</h1>
        <p className="mt-2 text-[13.5px] text-ink-soft">지금까지의 수업 기록을 한눈에 확인하세요.</p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Kpi icon={<Calendar className="h-4 w-4" />} label="총 수업" value={HISTORY.length} suffix="회" />
        <Kpi icon={<Award className="h-4 w-4" />} label="완료" value={completed} suffix="회" accent />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="잔여 횟수" value={14} suffix="/30회" />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-white overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-muted">
            <tr className="text-[11px] font-bold uppercase text-ink-soft">
              <th className="px-4 py-3 text-left">일시</th>
              <th className="px-4 py-3 text-left">트레이너 / 지점</th>
              <th className="px-4 py-3 text-left">메모</th>
              <th className="px-4 py-3 text-center">상태</th>
            </tr>
          </thead>
          <tbody>
            {HISTORY.map((h, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-4 py-3">
                  <p className="font-bold text-ink tabular-nums">{h.date}</p>
                  <p className="text-[11px] text-ink-soft tabular-nums">{h.time}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-bold text-ink">{h.trainer} 트레이너</p>
                  <p className="text-[11px] text-ink-soft">{h.gym}</p>
                </td>
                <td className="px-4 py-3 text-ink-soft">{h.note}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2.5 h-6 rounded-full text-[11px] font-extrabold ${h.status === "완료" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>{h.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function Kpi({ icon, label, value, suffix, accent }: { icon: React.ReactNode; label: string; value: number; suffix?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "bg-ink text-white border-ink" : "bg-white border-border"}`}>
      <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${accent ? "text-primary" : "text-ink-soft"}`}>{icon}{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-[28px] font-black tabular-nums leading-none">{value}</span>
        {suffix && <span className={`text-[12px] font-bold ${accent ? "text-white/70" : "text-ink-soft"}`}>{suffix}</span>}
      </div>
    </div>
  );
}
