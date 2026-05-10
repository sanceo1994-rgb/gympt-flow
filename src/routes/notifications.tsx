import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { RefreshCw, Send } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  component: Notifications,
});

const LOGS = [
  { type: "일정 선택 요청", to: "전체 학생 (14)", time: "11.20 09:12", status: "발송 성공", count: 14 },
  { type: "확정 알림", to: "김지원", time: "11.21 14:02", status: "발송 성공", count: 1 },
  { type: "변경 요청", to: "이도현", time: "11.21 17:33", status: "발송 실패", count: 1 },
  { type: "일정 선택 요청", to: "응답대기 학생 (3)", time: "11.22 10:00", status: "발송 성공", count: 3 },
  { type: "확정 알림", to: "박서윤", time: "11.22 11:14", status: "발송 성공", count: 1 },
];

function Notifications() {
  return (
    <AppShell>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[12px] font-bold text-primary uppercase tracking-widest">알림 / 카카오 알림톡</p>
          <h1 className="mt-1 text-[26px] sm:text-[30px] font-black text-ink">발송 내역</h1>
          <p className="mt-1 text-[13px] text-ink-soft">알림톡 연동은 준비 중이에요. 현재는 발송 시뮬레이션을 보여드려요.</p>
        </div>
        <div className="flex gap-2">
          <button className="h-10 px-4 rounded-full bg-card border border-border-strong text-[13px] font-bold inline-flex items-center gap-1">
            <RefreshCw className="h-3.5 w-3.5" /> 실패 건 재전송
          </button>
          <button className="h-10 px-4 rounded-full bg-primary text-white text-[13px] font-bold shadow-pop inline-flex items-center gap-1">
            <Send className="h-3.5 w-3.5" /> 새 알림 보내기
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="이번 달 발송" v="126" />
        <Stat label="성공" v="124" tone="primary" />
        <Stat label="실패" v="2" />
        <Stat label="잔여 (Basic)" v="94" />
      </div>

      <div className="mt-6 panel overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-muted">
            <tr className="text-left text-[11px] uppercase font-bold text-muted-foreground">
              <th className="px-5 py-3">유형</th>
              <th className="py-3">수신자</th>
              <th className="py-3">건수</th>
              <th className="py-3">시간</th>
              <th className="py-3 px-5">상태</th>
            </tr>
          </thead>
          <tbody>
            {LOGS.map((l, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-5 py-3 font-bold text-ink">{l.type}</td>
                <td className="py-3 text-ink-soft">{l.to}</td>
                <td className="py-3 text-ink-soft">{l.count}</td>
                <td className="py-3 text-muted-foreground">{l.time}</td>
                <td className="py-3 px-5">
                  <Badge tone={l.status === "발송 성공" ? "success" : "warn"}>{l.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function Stat({ label, v, tone }: { label: string; v: string; tone?: "primary" }) {
  return (
    <div className={`rounded-2xl p-4 ${tone === "primary" ? "bg-primary text-white" : "bg-surface-muted border border-border"}`}>
      <p className={`text-[11px] font-bold uppercase ${tone === "primary" ? "text-white/80" : "text-ink-soft"}`}>{label}</p>
      <p className={`mt-1 text-[26px] font-black ${tone === "primary" ? "text-white" : "text-ink"}`}>{v}</p>
    </div>
  );
}
