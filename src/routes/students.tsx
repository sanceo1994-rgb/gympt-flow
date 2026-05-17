import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMemo, useState } from "react";
import { Plus, Search, ArrowUpDown, Calendar, Award, TrendingUp, Trash2, Check } from "lucide-react";
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

type DraftRow = { name: string; phone: string; remaining: string; total: string; memo: string };
const emptyRow = (): DraftRow => ({ name: "", phone: "", remaining: "10", total: "10", memo: "" });

function StudentsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>(INITIAL);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [rows, setRows] = useState<DraftRow[]>(() => Array.from({ length: 8 }, emptyRow));
  const [openStudent, setOpenStudent] = useState<Student | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  const validRows = rows.filter((r) => r.name.trim() && r.phone.trim());
  const validCount = validRows.length;

  const updateRow = (i: number, patch: Partial<DraftRow>) => {
    setRows((prev) => {
      const next = prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
      // auto-extend: if user types in last row, add another
      if (i === next.length - 1 && (patch.name || patch.phone)) next.push(emptyRow());
      return next;
    });
  };
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const submitBulk = () => {
    if (validCount === 0) return;
    const today = new Date().toISOString().slice(2, 10).replace(/-/g, ".");
    const newOnes: Student[] = validRows.map((r) => ({
      name: r.name.trim(),
      phone: r.phone.trim(),
      joinedAt: today,
      remaining: Number(r.remaining) || 0,
      total: Number(r.total) || 0,
      status: "미가입",
      memo: r.memo,
    }));
    setStudents((prev) => [...newOnes, ...prev]);
    setRows(Array.from({ length: 8 }, emptyRow));
    setAdding(false);
    setToast(`${validCount}명의 학생이 등록되었어요 ✓`);
    setTimeout(() => setToast(null), 2400);
  };

  const studentHistory = openStudent ? (HISTORY_BY_STUDENT[openStudent.name] ?? []).filter((h) => h.trainer === TRAINER_NAME) : [];
  const completed = studentHistory.filter((h) => h.status === "완료").length;

  const onStudentNameClick = (s: Student) => {
    // All students in this list are this trainer's. (Demo: always navigate to pt-history.)
    navigate({ to: "/pt-history" });
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

      {/* Desktop / tablet table */}
      <div className="mt-4 rounded-2xl border border-border bg-white overflow-hidden hidden md:block">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-muted">
            <tr className="text-[11px] font-bold uppercase text-ink-soft">
              <Th label="학생 (등록일)" k="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <th className="px-4 py-3 text-left">전화번호</th>
              <Th label="잔여 / 총" k="remaining" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <Th label="상태" k="status" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <th className="px-4 py-3 text-left">메모</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.name + s.phone} className="border-t border-border align-top hover:bg-surface-muted/40">
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-surface-muted grid place-items-center font-black text-[12px] text-ink shrink-0">{s.name[0]}</div>
                    <div className="leading-tight">
                      <button onClick={() => onStudentNameClick(s)} className="font-bold text-ink text-[13px] hover:text-primary transition text-left">{s.name}</button>
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
                <td className="px-4 py-3 text-ink-soft text-[12.5px] max-w-xs cursor-pointer" onClick={() => setOpenStudent(s)}>{s.memo || <span className="text-muted-foreground">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="mt-4 grid gap-2 md:hidden">
        {sorted.map((s) => (
          <div key={s.name + s.phone} className="rounded-xl border border-border bg-white p-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-surface-muted grid place-items-center font-black text-[13px] text-ink shrink-0">{s.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <button onClick={() => onStudentNameClick(s)} className="font-bold text-ink text-[14px] hover:text-primary text-left truncate">{s.name}</button>
                  <span className={`inline-flex items-center px-2 h-5 rounded-full text-[10.5px] font-extrabold shrink-0 ${s.status === "가입" ? "bg-primary/10 text-primary" : "bg-muted text-ink-soft"}`}>{s.status}</span>
                </div>
                <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">등록 {s.joinedAt} · {s.phone}</p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <p className="text-[12px] tabular-nums">
                    <span className={`font-extrabold ${s.remaining <= 5 ? "text-destructive" : "text-ink"}`}>{s.remaining}</span>
                    <span className="text-muted-foreground"> / {s.total}회</span>
                  </p>
                  <button onClick={() => setOpenStudent(s)} className="text-[11px] font-bold text-primary">PT 내역 ›</button>
                </div>
                {s.memo && <p className="mt-1.5 text-[12px] text-ink-soft line-clamp-2">{s.memo}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating add button */}
      <button
        onClick={() => setAdding(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 h-14 px-6 rounded-full bg-primary text-white text-[14px] font-extrabold shadow-pink inline-flex items-center gap-2 hover:brightness-110">
        <Plus className="h-5 w-5" /> 학생 추가하기
      </button>

      {/* Bulk add sheet (excel-like) */}
      <Sheet open={adding} onOpenChange={(v) => !v && setAdding(false)}>
        <SheetContent side="right" className="w-full sm:!max-w-[50vw] overflow-y-auto">
          <SheetHeader>
            <span className="inline-flex w-fit chip bg-primary/10 text-primary"><Plus className="h-3 w-3" /> 일괄 등록</span>
            <SheetTitle className="text-[20px] font-black leading-tight">학생을 한번에 등록해요</SheetTitle>
            <SheetDescription>이름과 전화번호만 입력해도 등록할 수 있어요. 행을 채우면 자동으로 한 줄이 더 생겨요.</SheetDescription>
          </SheetHeader>

          <div className="mt-5 rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface-muted">
                <tr className="text-[10.5px] font-bold uppercase text-ink-soft">
                  <th className="px-2 py-2.5 text-center w-8">#</th>
                  <th className="px-2 py-2.5 text-left">이름</th>
                  <th className="px-2 py-2.5 text-left">전화번호</th>
                  <th className="px-2 py-2.5 text-center w-20">잔여</th>
                  <th className="px-2 py-2.5 text-center w-20">총</th>
                  <th className="px-2 py-2.5 text-left">메모</th>
                  <th className="px-2 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const filled = !!(r.name.trim() || r.phone.trim());
                  return (
                    <tr key={i} className={`border-t border-border ${filled ? "bg-primary/[0.03]" : ""}`}>
                      <td className="px-2 py-1.5 text-center text-[10px] text-muted-foreground tabular-nums">{i + 1}</td>
                      <td className="px-1 py-1"><Cell value={r.name} onChange={(v) => updateRow(i, { name: v })} placeholder="홍길동" /></td>
                      <td className="px-1 py-1"><Cell value={r.phone} onChange={(v) => updateRow(i, { phone: v })} placeholder="010-0000-0000" /></td>
                      <td className="px-1 py-1"><Cell value={r.remaining} onChange={(v) => updateRow(i, { remaining: v })} center /></td>
                      <td className="px-1 py-1"><Cell value={r.total} onChange={(v) => updateRow(i, { total: v })} center /></td>
                      <td className="px-1 py-1"><Cell value={r.memo} onChange={(v) => updateRow(i, { memo: v })} placeholder="목표 / 특이사항" /></td>
                      <td className="px-1 py-1 text-center">
                        {filled && (
                          <button onClick={() => removeRow(i)} className="h-7 w-7 grid place-items-center rounded-md text-ink-soft hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button onClick={() => setRows((p) => [...p, emptyRow(), emptyRow(), emptyRow()])} className="h-9 px-3 rounded-full bg-white border border-border text-ink text-[12px] font-bold inline-flex items-center gap-1 hover:bg-muted">
              <Plus className="h-3.5 w-3.5" /> 빈 줄 더하기
            </button>
            <p className="text-[11px] text-ink-soft">이름·전화번호가 모두 채워진 줄만 등록돼요</p>
          </div>

          <div className="mt-6 sticky bottom-0 -mx-6 px-6 py-4 bg-white border-t border-border">
            <button
              onClick={submitBulk}
              disabled={validCount === 0}
              className="w-full h-12 rounded-full bg-primary text-white text-[14px] font-extrabold inline-flex items-center justify-center gap-1.5 shadow-pop hover:brightness-110 disabled:opacity-40">
              <Check className="h-4 w-4" />
              {validCount === 0 ? "이름과 전화번호를 입력해주세요" : `${validCount}명 학생 등록하기`}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!openStudent} onOpenChange={(v) => !v && setOpenStudent(null)}>
        <SheetContent side="right" className="w-full sm:!max-w-[50vw] overflow-y-auto">
          <SheetHeader>
            <span className="inline-flex w-fit chip bg-primary/10 text-primary">PT 기록</span>
            <SheetTitle className="text-[20px] font-black leading-tight">{openStudent?.name} 회원의 PT 내역</SheetTitle>
            <SheetDescription>
              {TRAINER_NAME} 트레이너 · {TRAINER_GYM} 기준의 기록만 표시됩니다.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <MiniKpi icon={<Calendar className="h-3.5 w-3.5" />} label="총 수업" value={studentHistory.length} suffix="회" />
            <MiniKpi icon={<Award className="h-3.5 w-3.5" />} label="완료" value={completed} suffix="회" accent />
            <MiniKpi icon={<TrendingUp className="h-3.5 w-3.5" />} label="잔여" value={openStudent?.remaining ?? 0} suffix={`/${openStudent?.total ?? 0}회`} />
          </div>

          <div className="mt-5 rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface-muted">
                <tr className="text-[10.5px] font-bold uppercase text-ink-soft">
                  <th className="px-3 py-2.5 text-left">일시</th>
                  <th className="px-3 py-2.5 text-left">부위 / 메모</th>
                  <th className="px-3 py-2.5 text-center">상태</th>
                </tr>
              </thead>
              <tbody>
                {studentHistory.map((h, i) => (
                  <tr key={i} className="border-t border-border align-top">
                    <td className="px-3 py-3">
                      <p className="font-bold text-ink tabular-nums">{h.date}</p>
                      <p className="text-[10.5px] text-ink-soft tabular-nums">{h.time}</p>
                    </td>
                    <td className="px-3 py-3">
                      {h.part && <p className="text-[11px] font-extrabold text-primary">{h.part}</p>}
                      <p className="text-ink-soft mt-0.5">{h.note}</p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center px-2 h-5 rounded-full text-[10.5px] font-extrabold ${h.status === "완료" ? "bg-primary/10 text-primary" : h.status === "취소" ? "bg-destructive/10 text-destructive" : "bg-muted text-ink-soft"}`}>{h.status}</span>
                    </td>
                  </tr>
                ))}
                {studentHistory.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-10 text-center text-ink-soft">아직 기록이 없어요.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SheetContent>
      </Sheet>

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="rounded-2xl bg-ink text-white px-4 py-3 shadow-pop flex items-center gap-2.5 min-w-[280px]">
            <span className="h-8 w-8 rounded-full bg-primary grid place-items-center"><Check className="h-4 w-4" /></span>
            <p className="text-[13px] font-extrabold">{toast}</p>
          </div>
        </div>
      )}
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

function Cell({ value, onChange, placeholder, center }: { value: string; onChange: (v: string) => void; placeholder?: string; center?: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`h-9 w-full px-2 rounded-md bg-transparent border border-transparent hover:border-border focus:bg-white focus:border-ink outline-none text-[12.5px] font-semibold text-ink ${center ? "text-center tabular-nums" : ""}`}
    />
  );
}

function MiniKpi({ icon, label, value, suffix, accent }: { icon: React.ReactNode; label: string; value: number; suffix?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-2.5 ${accent ? "bg-ink text-white border-ink" : "bg-white border-border"}`}>
      <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${accent ? "text-primary" : "text-ink-soft"}`}>{icon}{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[20px] font-black tabular-nums leading-none">{value}</span>
        {suffix && <span className={`text-[10.5px] font-bold ${accent ? "text-white/70" : "text-ink-soft"}`}>{suffix}</span>}
      </div>
    </div>
  );
}
