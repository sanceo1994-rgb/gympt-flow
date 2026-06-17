import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Check, Plus, Search, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/students")({
  head: () => ({ meta: [{ title: "학생 관리 - PickGymPT" }] }),
  component: StudentsPage,
});

type Status = "active" | "pending";
type Student = {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedAt: string;
  remaining: number;
  total: number;
  status: Status;
  memo: string;
};

type SortKey = keyof Pick<Student, "name" | "email" | "phone" | "remaining" | "status">;
type DraftRow = { name: string; email: string; phone: string; remaining: string; total: string; memo: string };

const emptyRow = (): DraftRow => ({ name: "", email: "", phone: "", remaining: "10", total: "10", memo: "" });

function normalizeRosterRow(row: Record<string, unknown>): Student {
  return {
    id: String(row.id),
    name: String(row.student_name ?? ""),
    email: String(row.student_email ?? ""),
    phone: String(row.student_phone ?? ""),
    joinedAt: String(row.created_at ?? "").slice(2, 10).replace(/-/g, "."),
    remaining: Number(row.remaining_sessions ?? 0),
    total: Number(row.total_sessions ?? 0),
    status: row.status === "active" ? "active" : "pending",
    memo: String(row.memo ?? ""),
  };
}

function StudentsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [rows, setRows] = useState<DraftRow[]>(() => Array.from({ length: 5 }, emptyRow));
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = async () => {
    if (!user || String(user.id).startsWith("virtual-")) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: trainer, error: trainerError } = await supabase
      .from("trainers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (trainerError || !trainer) {
      setTrainerId(null);
      setStudents([]);
      setLoading(false);
      if (trainerError) setError("트레이너 프로필을 불러오지 못했습니다.");
      return;
    }

    setTrainerId(trainer.id);

    const { data, error: rosterError } = await supabase
      .from("student_rosters" as never)
      .select("*")
      .eq("trainer_id", trainer.id)
      .order("created_at", { ascending: false });

    if (rosterError) {
      setError("학생 명단 테이블이 아직 Supabase에 적용되지 않았습니다. 마이그레이션 적용이 필요합니다.");
      setStudents([]);
    } else {
      setStudents(((data ?? []) as unknown as Record<string, unknown>[]).map(normalizeRosterRow));
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) void loadStudents();
  }, [authLoading, user?.id]);

  const sorted = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = students.filter((s) =>
      !needle ||
      s.name.toLowerCase().includes(needle) ||
      s.email.toLowerCase().includes(needle) ||
      s.phone.includes(needle),
    );

    return [...list].sort((a, b) => {
      const av = a[sortKey] as string | number;
      const bv = b[sortKey] as string | number;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [students, sortKey, sortDir, q]);

  const validRows = rows.filter((r) => r.name.trim() && r.email.trim());
  const validCount = validRows.length;

  const onSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const updateRow = (i: number, patch: Partial<DraftRow>) => {
    setRows((prev) => {
      const next = prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
      if (i === next.length - 1 && (patch.name || patch.email || patch.phone)) next.push(emptyRow());
      return next;
    });
  };

  const submitBulk = async () => {
    if (!trainerId || validCount === 0) return;

    const payload = validRows.map((r) => ({
      trainer_id: trainerId,
      student_name: r.name.trim(),
      student_email: r.email.trim().toLowerCase(),
      student_phone: r.phone.trim(),
      remaining_sessions: Number(r.remaining) || 0,
      total_sessions: Number(r.total) || 0,
      memo: r.memo.trim() || null,
      status: "pending",
    }));

    const { error: insertError } = await supabase.from("student_rosters" as never).insert(payload as never);
    if (insertError) {
      setError("학생 명단 저장에 실패했습니다.");
      return;
    }

    setRows(Array.from({ length: 5 }, emptyRow));
    setAdding(false);
    setToast(`${validCount}명의 학생을 등록했습니다.`);
    setTimeout(() => setToast(null), 2400);
    await loadStudents();
  };

  const deleteStudent = async (student: Student) => {
    const { error: deleteError } = await supabase.from("student_rosters" as never).delete().eq("id", student.id);
    if (deleteError) {
      setError("학생 삭제에 실패했습니다.");
      return;
    }
    setStudents((prev) => prev.filter((s) => s.id !== student.id));
  };

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">트레이너 메뉴</p>
          <h1 className="mt-1.5 text-[26px] sm:text-[30px] font-black text-ink leading-tight">학생 관리</h1>
          <p className="mt-2 text-[13.5px] text-ink-soft">여기에 등록된 학생만 본인 계정으로 로그인했을 때 예약 화면을 열 수 있습니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-surface-muted rounded-xl px-3 h-10 border border-border">
            <Search className="h-4 w-4 text-ink-soft" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름/이메일/전화 검색" className="bg-transparent outline-none text-[13px] w-52" />
          </div>
          <button onClick={() => setAdding(true)} className="h-10 px-4 rounded-xl bg-primary text-white text-[13px] font-extrabold inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> 추가
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] font-bold text-destructive">
          {error}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-border bg-white overflow-hidden hidden md:block">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-muted">
            <tr className="text-[11px] font-bold uppercase text-ink-soft">
              <Th label="학생" k="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <Th label="이메일" k="email" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <Th label="전화번호" k="phone" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <Th label="잔여 / 총" k="remaining" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <Th label="상태" k="status" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <th className="px-4 py-3 text-left">메모</th>
              <th className="px-4 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.id} className="border-t border-border align-top hover:bg-surface-muted/40">
                <td className="px-4 py-3">
                  <button onClick={() => navigate({ to: "/pt-history" })} className="font-bold text-ink hover:text-primary text-left">{s.name}</button>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5 tabular-nums">{s.joinedAt}</p>
                </td>
                <td className="px-4 py-3 text-ink-soft">{s.email}</td>
                <td className="px-4 py-3 tabular-nums text-ink-soft">{s.phone || "-"}</td>
                <td className="px-4 py-3 tabular-nums">
                  <span className={`font-extrabold ${s.remaining <= 3 ? "text-destructive" : "text-ink"}`}>{s.remaining}</span>
                  <span className="text-muted-foreground"> / {s.total}회</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 h-6 rounded-full text-[11px] font-extrabold ${s.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-ink-soft"}`}>
                    {s.status === "active" ? "활성" : "초대"}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-soft text-[12.5px] max-w-xs">{s.memo || "-"}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => void deleteStudent(s)} className="h-8 w-8 rounded-lg text-ink-soft hover:bg-destructive/10 hover:text-destructive inline-grid place-items-center">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-ink-soft">등록된 학생이 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-2 md:hidden">
        {sorted.map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <button onClick={() => navigate({ to: "/pt-history" })} className="font-bold text-ink text-[14px] hover:text-primary text-left truncate">{s.name}</button>
                <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">{s.email}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">{s.phone || "-"}</p>
              </div>
              <button onClick={() => void deleteStudent(s)} className="h-8 w-8 rounded-lg text-ink-soft hover:bg-destructive/10 hover:text-destructive inline-grid place-items-center shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[12px] tabular-nums">
                <b className={s.remaining <= 3 ? "text-destructive" : "text-ink"}>{s.remaining}</b>
                <span className="text-muted-foreground"> / {s.total}회</span>
              </span>
              <span className={`inline-flex items-center px-2 h-5 rounded-full text-[10.5px] font-extrabold ${s.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-ink-soft"}`}>
                {s.status === "active" ? "활성" : "초대"}
              </span>
            </div>
            {s.memo && <p className="mt-1.5 text-[12px] text-ink-soft line-clamp-2">{s.memo}</p>}
          </div>
        ))}
      </div>

      <Sheet open={adding} onOpenChange={(v) => !v && setAdding(false)}>
        <SheetContent side="right" className="w-full sm:!max-w-[56vw] overflow-y-auto">
          <SheetHeader>
            <span className="inline-flex w-fit chip bg-primary/10 text-primary"><Plus className="h-3 w-3" /> 일괄 등록</span>
            <SheetTitle className="text-[20px] font-black leading-tight">학생을 한 번에 등록하세요</SheetTitle>
            <SheetDescription>이메일은 학생 로그인 계정과 매칭되는 핵심 값입니다.</SheetDescription>
          </SheetHeader>

          <div className="mt-5 grid gap-3">
            {rows.map((r, i) => (
              <div key={i} className="rounded-2xl border border-border p-3 bg-white">
                <div className="grid md:grid-cols-[1fr_1.4fr_1fr_80px_80px_1.2fr_32px] gap-2 items-end">
                  <Field label="이름"><Cell value={r.name} onChange={(v) => updateRow(i, { name: v })} placeholder="김학생" /></Field>
                  <Field label="이메일"><Cell value={r.email} onChange={(v) => updateRow(i, { email: v })} placeholder="student@example.com" /></Field>
                  <Field label="전화번호"><Cell value={r.phone} onChange={(v) => updateRow(i, { phone: v })} placeholder="010-0000-0000" /></Field>
                  <Field label="잔여"><Cell value={r.remaining} onChange={(v) => updateRow(i, { remaining: v })} center /></Field>
                  <Field label="총"><Cell value={r.total} onChange={(v) => updateRow(i, { total: v })} center /></Field>
                  <Field label="메모"><Cell value={r.memo} onChange={(v) => updateRow(i, { memo: v })} placeholder="목표 / 특이사항" /></Field>
                  <button onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))} className="h-9 w-9 grid place-items-center rounded-md text-ink-soft hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button onClick={() => setRows((p) => [...p, emptyRow()])} className="h-9 px-3 rounded-full bg-white border border-border text-ink text-[12px] font-bold inline-flex items-center gap-1 hover:bg-muted">
              <Plus className="h-3.5 w-3.5" /> 줄 추가
            </button>
            <p className="text-[11px] text-ink-soft">이름과 이메일이 있는 줄만 등록됩니다.</p>
          </div>

          <div className="mt-6 sticky bottom-0 -mx-6 px-6 py-4 bg-white border-t border-border">
            <button
              onClick={() => void submitBulk()}
              disabled={!trainerId || validCount === 0}
              className="w-full h-12 rounded-full bg-primary text-white text-[14px] font-extrabold inline-flex items-center justify-center gap-1.5 shadow-pop hover:brightness-110 disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              {validCount === 0 ? "이름과 이메일을 입력해주세요" : `${validCount}명 등록하기`}
            </button>
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
        {active && <span className="text-primary text-[10px]">{sortDir === "asc" ? "오름" : "내림"}</span>}
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
      className={`h-9 w-full px-2 rounded-md bg-transparent border border-border focus:bg-white focus:border-ink outline-none text-[12.5px] font-semibold text-ink ${center ? "text-center tabular-nums" : ""}`}
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10.5px] font-bold uppercase tracking-wider text-ink-soft mb-0.5">{label}</span>
      {children}
    </label>
  );
}
