import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMemo, useState } from "react";
import { Plus, Search, ArrowUpDown, Check, X, Calendar, Award, TrendingUp } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export const Route = createFileRoute("/students")({
  head: () => ({ meta: [{ title: "학생 관리 — 픽짐피티" }] }),
  component: StudentsPage,
});

const TRAINER_NAME = "박재현";
const TRAINER_GYM = "하이엔드 강남점";

type HistoryRow = { date: string; time: string; trainer: string; gym: string; status: "완료" | "취소" | "예정"; note: string; part?: string };
const HISTORY_BY_STUDENT: Record<string, HistoryRow[]> = {
  김지원: [
    { date: "2026.05.12 (화)", time: "19:00", trainer: "박재현", gym: TRAINER_GYM, status: "완료", note: "스쿼트 3x8, 폼 안정", part: "하체 · 스쿼트" },
    { date: "2026.05.07 (목)", time: "07:00", trainer: "박재현", gym: TRAINER_GYM, status: "완료", note: "벤치 60kg 도전", part: "가슴 · 벤치프레스" },
    { date: "2026.05.05 (화)", time: "19:00", trainer: "박재현", gym: TRAINER_GYM, status: "취소", note: "회원 사정으로 당일 취소" },
    { date: "2026.04.20 (월)", time: "20:00", trainer: "이서연", gym: "성수점", status: "완료", note: "(다른 트레이너 기록)" },
  ],
  박서윤: [
    { date: "2026.05.10 (일)", time: "11:00", trainer: "박재현", gym: TRAINER_GYM, status: "완료", note: "데드 80kg", part: "등 · 데드리프트" },
    { date: "2026.05.03 (일)", time: "11:00", trainer: "박재현", gym: TRAINER_GYM, status: "완료", note: "랫풀다운 / 시티드로우", part: "등 · 랫풀다운" },
  ],
  최유나: [
    { date: "2026.05.11 (월)", time: "09:00", trainer: "박재현", gym: TRAINER_GYM, status: "완료", note: "오버헤드프레스 폼 교정", part: "어깨 · 오버헤드프레스" },
  ],
};

type Status = "가입" | "미가입";
type Student = {
  name: string;
  phone: string;
  joinedAt: string;
  remaining: number;
  total: number;
  status: Status;
  memo: string;
};

const INITIAL: Student[] = [
  { name: "김지원", phone: "010-1234-5678", joinedAt: "24.03.12", remaining: 14, total: 30, status: "가입", memo: "오전 선호. 어깨 통증 모니터링" },
  { name: "박서윤", phone: "010-2345-6789", joinedAt: "24.08.21", remaining: 7, total: 20, status: "가입", memo: "다이어트 목표 -5kg" },
  { name: "최유나", phone: "010-3456-7890", joinedAt: "23.11.05", remaining: 22, total: 40, status: "가입", memo: "근비대 위주 / 단백질 보충제 복용" },
  { name: "정수민", phone: "010-4567-8901", joinedAt: "25.01.18", remaining: 3, total: 20, status: "가입", memo: "재등록 권유 필요" },
  { name: "한승호", phone: "010-5678-9012", joinedAt: "24.06.30", remaining: 11, total: 24, status: "가입", memo: "데드리프트 100kg 도전 중" },
  { name: "이도현", phone: "010-6789-0123", joinedAt: "25.04.02", remaining: 5, total: 10, status: "미가입", memo: "픽짐피티 가입 안내 카톡 전송함" },
  { name: "김태현", phone: "010-7890-1234", joinedAt: "24.12.10", remaining: 9, total: 20, status: "미가입", memo: "전화로 확인 필요" },
  { name: "윤서아", phone: "010-8901-2345", joinedAt: "25.02.14", remaining: 4, total: 10, status: "가입", memo: "재활 — 무릎 주의" },
  { name: "강민준", phone: "010-9012-3456", joinedAt: "24.09.05", remaining: 12, total: 24, status: "가입", memo: "" },
  { name: "오지훈", phone: "010-0123-4567", joinedAt: "25.03.20", remaining: 8, total: 20, status: "미가입", memo: "추가 안내 예정" },
];

type SortKey = keyof Student;

function StudentsPage() {
  const [students, setStudents] = useState<Student[]>(INITIAL);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Student>({ name: "", phone: "", joinedAt: new Date().toISOString().slice(2, 10).replace(/-/g, "."), remaining: 10, total: 10, status: "미가입", memo: "" });

  const sorted = useMemo(() => {
    const list = students.filter((s) => s.name.includes(q) || s.phone.includes(q));
    return [...list].sort((a, b) => {
      const av = a[sortKey] as string | number;
      const bv = b[sortKey] as string | number;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [students, sortKey, sortDir, q]);

  const onSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  const saveNew = () => {
    if (!draft.name || !draft.phone) return;
    setStudents((prev) => [{ ...draft }, ...prev]);
    setDraft({ name: "", phone: "", joinedAt: new Date().toISOString().slice(2, 10).replace(/-/g, "."), remaining: 10, total: 10, status: "미가입", memo: "" });
    setAdding(false);
  };

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">트레이너 메뉴</p>
          <h1 className="mt-1.5 text-[26px] sm:text-[30px] font-black text-ink leading-tight">학생 관리</h1>
          <p className="mt-2 text-[13.5px] text-ink-soft">학생 정보를 등록하고, 카톡으로 일정 요청을 보낼 수 있어요.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-surface-muted rounded-xl px-3 h-10 border border-border">
            <Search className="h-4 w-4 text-ink-soft" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름/전화번호 검색" className="bg-transparent outline-none text-[13px] w-44" />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-white overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-muted">
            <tr className="text-[11px] font-bold uppercase text-ink-soft">
              <Th label="학생 (등록일)" k="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <th className="px-4 py-3 text-left">
                <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-primary text-white text-[10.5px] font-extrabold hover:brightness-110">
                  <Plus className="h-3 w-3" /> 학생 추가하기
                </button>
              </th>
              <Th label="잔여 / 총" k="remaining" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <Th label="상태" k="status" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <th className="px-4 py-3 text-left">메모</th>
            </tr>
          </thead>
          <tbody>
            {adding && (
              <tr className="border-t border-border bg-primary/[0.04]">
                <td className="px-4 py-2.5">
                  <Input value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} placeholder="이름" />
                  <Input className="mt-1" value={draft.joinedAt} onChange={(v) => setDraft((d) => ({ ...d, joinedAt: v }))} placeholder="25.05.14" />
                </td>
                <td className="px-4 py-2.5">
                  <Input value={draft.phone} onChange={(v) => setDraft((d) => ({ ...d, phone: v }))} placeholder="010-0000-0000" />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <Input className="w-12" value={String(draft.remaining)} onChange={(v) => setDraft((d) => ({ ...d, remaining: Number(v) || 0 }))} />
                    <span className="text-ink-soft">/</span>
                    <Input className="w-12" value={String(draft.total)} onChange={(v) => setDraft((d) => ({ ...d, total: Number(v) || 0 }))} />
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center px-2.5 h-6 rounded-full bg-muted text-ink-soft text-[11px] font-extrabold">미가입</span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <Input value={draft.memo} onChange={(v) => setDraft((d) => ({ ...d, memo: v }))} placeholder="메모" />
                    <button onClick={saveNew} className="h-8 w-8 grid place-items-center rounded-lg bg-primary text-white"><Check className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setAdding(false)} className="h-8 w-8 grid place-items-center rounded-lg bg-white border border-border text-ink-soft"><X className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            )}
            {sorted.map((s) => (
              <tr key={s.name + s.phone} className="border-t border-border align-top hover:bg-surface-muted/40">
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-surface-muted grid place-items-center font-black text-[12px] text-ink shrink-0">{s.name[0]}</div>
                    <div className="leading-tight">
                      <p className="font-bold text-ink text-[13px]">{s.name}</p>
                      <p className="text-[10.5px] text-muted-foreground mt-0.5 tabular-nums">{s.joinedAt}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums text-ink-soft">{s.phone}</td>
                <td className="px-4 py-3 tabular-nums">
                  <span className={`font-extrabold ${s.remaining <= 5 ? "text-destructive" : "text-ink"}`}>{s.remaining}</span>
                  <span className="text-muted-foreground"> / {s.total}회</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 h-6 rounded-full text-[11px] font-extrabold ${s.status === "가입" ? "bg-primary/10 text-primary" : "bg-muted text-ink-soft"}`}>{s.status}</span>
                </td>
                <td className="px-4 py-3 text-ink-soft text-[12.5px] max-w-xs">{s.memo || <span className="text-muted-foreground">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function Th({ label, k, sortKey, sortDir, onSort }: { label: string; k: SortKey; sortKey: SortKey; sortDir: "asc" | "desc"; onSort: (k: SortKey) => void }) {
  const active = sortKey === k;
  return (
    <th className="px-4 py-3 text-left">
      <button onClick={() => onSort(k)} className={`inline-flex items-center gap-1 ${active ? "text-ink" : ""} hover:text-ink`}>
        {label} <ArrowUpDown className={`h-3 w-3 ${active ? "text-primary" : "opacity-40"}`} />
        {active && <span className="text-primary text-[10px]">{sortDir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}

function Input({ value, onChange, placeholder, className = "" }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`h-8 px-2.5 rounded-lg bg-white border border-border focus:border-ink outline-none text-[12.5px] font-semibold text-ink w-full ${className}`}
    />
  );
}
