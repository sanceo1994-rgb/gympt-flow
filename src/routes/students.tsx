import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { useState } from "react";
import { Send, Search, Filter, MoreHorizontal } from "lucide-react";

export const Route = createFileRoute("/students")({
  component: Students,
});

const STUDENTS = Array.from({ length: 14 }).map((_, i) => {
  const names = ["김지원", "박서윤", "이도현", "최유나", "한승호", "정수민", "오지훈", "백다은", "임채린", "강민재", "윤하늘", "송태양", "조은별", "권지호"];
  const statuses = ["응답완료", "확정완료", "응답대기", "미배정", "응답완료"];
  const status = statuses[i % statuses.length];
  return {
    name: names[i],
    phone: `010-${String(1000 + i * 13).padStart(4, "0")}-${String(2000 + i * 7).padStart(4, "0")}`,
    status,
    picks: status === "응답대기" ? [] : ["월 19시", "수 19시", "금 20시"].slice(0, 3 - (i % 3)),
    assigned: status === "확정완료" ? "월 19시" : status === "응답완료" ? "—" : "—",
    remain: 12 - i,
    last: `11.${10 + (i % 12)}`,
    noti: status === "응답대기" ? "재전송 필요" : status === "확정완료" ? "확정발송" : "대기",
  };
});

function Students() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"전체" | "응답대기" | "응답완료" | "확정완료" | "미배정">("전체");
  const list = STUDENTS.filter((s) => (filter === "전체" || s.status === filter) && s.name.includes(q));

  return (
    <AppShell>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[12px] font-bold text-primary uppercase tracking-widest">학생 관리</p>
          <h1 className="mt-1 text-[26px] sm:text-[30px] font-black text-ink">내 학생 · 14명</h1>
          <p className="mt-1 text-[13px] text-ink-soft">응답 상태와 PT 잔여 횟수를 한 눈에 확인하세요.</p>
        </div>
        <div className="flex gap-2">
          <button className="h-10 px-4 rounded-full bg-card border border-border-strong text-[13px] font-bold inline-flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> 정렬
          </button>
          <button className="h-10 px-4 rounded-full bg-primary text-white text-[13px] font-bold inline-flex items-center gap-1 shadow-pop">
            <Send className="h-3.5 w-3.5" /> 다음 주 일정 요청
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 px-3 h-9 rounded-full bg-surface-muted border border-border">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="bg-transparent text-[13px] outline-none w-40" placeholder="학생 검색" />
        </div>
        {(["전체", "응답완료", "응답대기", "확정완료", "미배정"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 h-9 rounded-full text-[12px] font-bold ${filter === f ? "bg-ink text-white" : "bg-surface-muted text-ink-soft"}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="mt-4 -mx-4 sm:mx-0 sm:rounded-2xl overflow-x-auto sm:border sm:border-border">
        <table className="w-full text-[13px] min-w-[860px]">
          <thead className="bg-surface-muted">
            <tr className="text-left text-[11px] uppercase font-bold text-muted-foreground">
              <th className="px-4 py-3">학생</th>
              <th className="py-3">상태</th>
              <th className="py-3">선호 시간</th>
              <th className="py-3">배정</th>
              <th className="py-3">잔여</th>
              <th className="py-3">최근 PT</th>
              <th className="py-3">알림</th>
              <th className="py-3 px-4 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((s, i) => (
              <tr key={i} className="border-t border-border hover:bg-surface-muted/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/80 to-[#FF6BA8] grid place-items-center text-white font-black text-[12px]">{s.name[0]}</div>
                    <div>
                      <p className="font-bold text-ink leading-tight">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground">{s.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3">
                  <Badge tone={s.status === "응답완료" ? "primary" : s.status === "확정완료" ? "ink" : "warn"}>{s.status}</Badge>
                </td>
                <td className="py-3">
                  {s.picks.length === 0 ? (
                    <span className="text-muted-foreground text-[12px]">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {s.picks.map((p, j) => (
                        <span key={j} className={`px-2 h-6 inline-flex items-center rounded-md text-[11px] font-bold ${j === 0 ? "bg-primary-soft text-primary" : "bg-muted text-ink-soft"}`}>
                          {j + 1}순위 {p}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-3 font-bold text-ink">{s.assigned}</td>
                <td className="py-3 text-ink-soft">{s.remain}회</td>
                <td className="py-3 text-ink-soft">{s.last}</td>
                <td className="py-3">
                  <Badge tone={s.noti === "확정발송" ? "success" : s.noti === "재전송 필요" ? "warn" : "muted"}>{s.noti}</Badge>
                </td>
                <td className="py-3 px-4 text-right">
                  <button className="h-7 w-7 rounded-full hover:bg-muted inline-grid place-items-center"><MoreHorizontal className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
