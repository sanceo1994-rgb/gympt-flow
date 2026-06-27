import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { pickDisplayName } from "@/lib/display-name";
import { formatPhoneNumber } from "@/lib/phone";
import { trackEvent } from "@/lib/analytics";
import { matchesKoreanSearch } from "@/lib/koreanSearch";

export const Route = createFileRoute("/students")({
  head: () => ({ meta: [{ title: "학생 관리 - PickGymPT" }] }),
  component: StudentsPage,
});

type Status = "unregistered" | "member" | "ended";
const STATUS_LABEL: Record<Status, string> = {
  unregistered: "미가입",
  member: "PT 중",
  ended: "종료",
};

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

type SortKey = keyof Pick<Student, "name" | "phone" | "remaining" | "status">;
type DraftRow = {
  name: string;
  phone: string;
  remaining: string;
  total: string;
  memo: string;
};

const emptyRow = (): DraftRow => ({
  name: "",
  phone: "",
  remaining: "10",
  total: "10",
  memo: "",
});

function deriveStatus(signedUp: boolean, remaining: number): Status {
  if (!signedUp) return "unregistered";
  return remaining > 0 ? "member" : "ended";
}

function normalizeRosterRow(row: Record<string, unknown>): Student {
  const remaining = Number(row.remaining_sessions ?? 0);
  const signedUp = row.student_user_id != null;
  return {
    id: String(row.id),
    name: pickDisplayName(row.student_name) ?? "이름 확인 필요",
    email: String(row.student_email ?? ""),
    phone: formatPhoneNumber(String(row.student_phone ?? "")),
    joinedAt: String(row.created_at ?? "")
      .slice(2, 10)
      .replace(/-/g, "."),
    remaining,
    total: Number(row.total_sessions ?? 0),
    status: deriveStatus(signedUp, remaining),
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
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editDraft, setEditDraft] = useState<DraftRow>(emptyRow);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeleteRef = useRef<Student | null>(null);

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
      setError(
        "학생 명단 테이블이 아직 Supabase에 적용되지 않았습니다. 마이그레이션 적용이 필요합니다.",
      );
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
    const list = students.filter(
      (s) => !needle || matchesKoreanSearch(s.name, needle) || s.phone.includes(needle),
    );

    return [...list].sort((a, b) => {
      const av = a[sortKey] as string | number;
      const bv = b[sortKey] as string | number;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [students, sortKey, sortDir, q]);

  const validRows = rows.filter(
    (r) => r.name.trim() && r.phone.replace(/\D/g, "").length === 11,
  );
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
      if (i === next.length - 1 && (patch.name || patch.phone))
        next.push(emptyRow());
      return next;
    });
  };

  const submitBulk = async () => {
    if (!trainerId || validCount === 0) return;

    const payload = validRows.map((r) => ({
      trainer_id: trainerId,
      student_name: r.name.trim(),
      student_email: null,
      student_phone: formatPhoneNumber(r.phone),
      remaining_sessions: Number(r.remaining) || 0,
      total_sessions: Number(r.total) || 0,
      memo: r.memo.trim() || null,
    }));

    const { error: insertError } = await supabase
      .from("student_rosters" as never)
      .insert(payload as never);
    if (insertError) {
      setError("학생 명단 저장에 실패했습니다.");
      return;
    }

    trackEvent("Students Added", { student_count: validCount });

    setRows(Array.from({ length: 5 }, emptyRow));
    setAdding(false);
    setToast(`${validCount}명의 학생을 등록했습니다.`);
    setTimeout(() => setToast(null), 2400);
    await loadStudents();
  };

  const commitDelete = async (student: Student) => {
    const { error: deleteError } = await supabase
      .from("student_rosters" as never)
      .delete()
      .eq("id", student.id);
    if (deleteError) {
      setError("학생 삭제에 실패했습니다.");
      setStudents((prev) =>
        prev.some((item) => item.id === student.id) ? prev : [...prev, student],
      );
    }
    if (pendingDeleteRef.current?.id === student.id) {
      pendingDeleteRef.current = null;
      setPendingDelete(null);
    }
  };

  const scheduleDelete = (student: Student) => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    if (pendingDeleteRef.current) void commitDelete(pendingDeleteRef.current);

    setStudents((prev) => prev.filter((item) => item.id !== student.id));
    setDeleteTarget(null);
    setPendingDelete(student);
    pendingDeleteRef.current = student;
    deleteTimerRef.current = setTimeout(() => void commitDelete(student), 5000);
  };

  const undoDelete = () => {
    if (!pendingDeleteRef.current) return;
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    setStudents((prev) => [...prev, pendingDeleteRef.current as Student]);
    pendingDeleteRef.current = null;
    setPendingDelete(null);
  };

  useEffect(
    () => () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      if (pendingDeleteRef.current)
        void supabase
          .from("student_rosters" as never)
          .delete()
          .eq("id", pendingDeleteRef.current.id);
    },
    [],
  );

  const openEdit = (student: Student) => {
    setEditingStudent(student);
    setEditDraft({
      name: student.name,
      phone: student.phone,
      remaining: String(student.remaining),
      total: String(student.total),
      memo: student.memo,
    });
  };

  const saveEdit = async () => {
    if (!editingStudent || !editDraft.name.trim()) return;
    const patch = {
      student_name: editDraft.name.trim(),
      student_phone: formatPhoneNumber(editDraft.phone),
      remaining_sessions: Number(editDraft.remaining) || 0,
      total_sessions: Number(editDraft.total) || 0,
      memo: editDraft.memo.trim() || null,
    };
    const { error: updateError } = await supabase
      .from("student_rosters" as never)
      .update(patch as never)
      .eq("id", editingStudent.id);
    if (updateError) {
      setError("학생 정보 수정에 실패했습니다.");
      return;
    }
    setStudents((prev) =>
      prev.map((student) =>
        student.id === editingStudent.id
          ? {
              ...student,
              ...patch,
              name: patch.student_name,
              phone: patch.student_phone,
              remaining: patch.remaining_sessions,
              total: patch.total_sessions,
              memo: patch.memo ?? "",
              status: deriveStatus(student.status !== "unregistered", patch.remaining_sessions),
            }
          : student,
      ),
    );
    setEditingStudent(null);
    setToast("학생 정보를 수정했습니다.");
    setTimeout(() => setToast(null), 2400);
  };

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            트레이너 메뉴
          </p>
          <h1 className="mt-1.5 text-[26px] sm:text-[30px] font-black text-ink leading-tight">
            학생 관리
          </h1>
          <p className="mt-2 text-[13.5px] text-ink-soft">
            여기에 등록된 학생만 본인 계정으로 로그인했을 때 예약 화면을 열 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 items-center gap-1.5 rounded-xl border border-border bg-surface-muted px-2.5 sm:h-10 sm:px-3">
            <Search className="h-3.5 w-3.5 text-ink-soft sm:h-4 sm:w-4" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="이름/전화 검색"
              className="w-[166px] bg-transparent text-[12px] outline-none sm:w-52 sm:text-[13px]"
            />
          </div>
          <button
            onClick={() => setAdding(true)}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-[18px] text-[14px] font-extrabold text-white sm:h-10 sm:px-4 sm:text-[13px]"
          >
            <Plus className="h-[18px] w-[18px] sm:h-4 sm:w-4" /> 추가
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] font-bold text-destructive">
          {error}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-border bg-white overflow-hidden hidden md:block">
        <table className="w-full table-fixed text-[13px]">
          <colgroup>
            <col className="w-[10%]" />
            <col className="w-[14%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[45%]" />
            <col className="w-[11%]" />
          </colgroup>
          <thead className="bg-surface-muted">
            <tr className="text-[11px] font-bold uppercase text-ink-soft">
              <Th label="학생" k="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <Th label="전화번호" k="phone" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <Th
                label="잔여 / 총"
                k="remaining"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
              <Th label="상태" k="status" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <th className="px-4 py-3 text-center">메모</th>
              <th className="px-7 py-3 text-center">관리</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.id} className="border-t border-border align-top hover:bg-surface-muted/40">
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => navigate({ to: "/pt-history" })}
                    className="mx-auto block font-bold text-ink hover:text-primary"
                  >
                    {s.name}
                  </button>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5 tabular-nums">
                    {s.joinedAt}
                  </p>
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-ink-soft">
                  {s.phone || "-"}
                </td>
                <td className="px-4 py-3 text-center tabular-nums">
                  <span
                    className={`font-extrabold ${s.remaining <= 3 ? "text-destructive" : "text-ink"}`}
                  >
                    {s.remaining}
                  </span>
                  <span className="text-muted-foreground"> / {s.total}회</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex items-center px-2.5 h-6 rounded-full text-[11px] font-extrabold ${s.status === "member" ? "bg-emerald-50 text-emerald-700" : s.status === "ended" ? "bg-destructive/10 text-destructive" : "bg-muted text-ink-soft"}`}
                  >
                    {STATUS_LABEL[s.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-ink-soft text-[12.5px]">
                  {s.memo || "-"}
                </td>
                <td className="px-7 py-3 text-center">
                  <div className="inline-flex items-center justify-center gap-1">
                    <button
                      onClick={() => openEdit(s)}
                      title="수정"
                      aria-label={`${s.name} 수정`}
                      className="h-8 w-8 rounded-lg text-ink-soft hover:bg-primary/10 hover:text-primary inline-grid place-items-center"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(s)}
                      title="삭제"
                      aria-label={`${s.name} 삭제`}
                      className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 inline-grid place-items-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-ink-soft">
                  등록된 학생이 없습니다.
                </td>
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
                <button
                  onClick={() => navigate({ to: "/pt-history" })}
                  className="font-bold text-ink text-[14px] hover:text-primary text-left truncate"
                >
                  {s.name}
                </button>
                <p className="text-[11px] text-muted-foreground tabular-nums">{s.phone || "-"}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(s)}
                  title="수정"
                  aria-label={`${s.name} 수정`}
                  className="h-8 w-8 rounded-lg text-ink-soft hover:bg-primary/10 hover:text-primary inline-grid place-items-center"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(s)}
                  title="삭제"
                  aria-label={`${s.name} 삭제`}
                  className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 inline-grid place-items-center"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[12px] tabular-nums">
                <b className={s.remaining <= 3 ? "text-destructive" : "text-ink"}>{s.remaining}</b>
                <span className="text-muted-foreground"> / {s.total}회</span>
              </span>
              <span
                className={`inline-flex items-center px-2 h-5 rounded-full text-[10.5px] font-extrabold ${s.status === "member" ? "bg-emerald-50 text-emerald-700" : s.status === "ended" ? "bg-destructive/10 text-destructive" : "bg-muted text-ink-soft"}`}
              >
                {STATUS_LABEL[s.status]}
              </span>
            </div>
            {s.memo && <p className="mt-1.5 text-[12px] text-ink-soft line-clamp-2">{s.memo}</p>}
          </div>
        ))}
      </div>

      <Sheet open={adding} onOpenChange={(v) => !v && setAdding(false)}>
        <SheetContent side="right" className="w-[88vw] sm:!max-w-[56vw] overflow-y-auto">
          <SheetHeader>
            <span className="inline-flex w-fit chip bg-primary/10 text-primary">
              <Plus className="h-3 w-3" /> 일괄 등록
            </span>
            <SheetTitle className="text-[20px] font-black leading-tight">
              학생을 한 번에 등록하세요
            </SheetTitle>
            <SheetDescription>
              이름과 휴대폰 번호를 등록합니다. 계정 권한은 인증된 회원만 연결됩니다.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 grid gap-3">
            {rows.map((r, i) => (
              <div key={i} className="rounded-2xl border border-border p-3 bg-white">
                <div className="grid md:grid-cols-[1fr_1.15fr_80px_80px_1.4fr_32px] gap-2 items-end">
                  <Field label="이름">
                    <Cell
                      value={r.name}
                      onChange={(v) => updateRow(i, { name: v })}
                      placeholder="김학생"
                    />
                  </Field>
                  <Field label="전화번호">
                    <Cell
                      value={r.phone}
                      onChange={(v) => updateRow(i, { phone: formatPhoneNumber(v) })}
                      placeholder="010-0000-0000"
                      inputMode="numeric"
                    />
                  </Field>
                  <Field label="잔여">
                    <Cell
                      value={r.remaining}
                      onChange={(v) => updateRow(i, { remaining: v })}
                      center
                    />
                  </Field>
                  <Field label="총">
                    <Cell value={r.total} onChange={(v) => updateRow(i, { total: v })} center />
                  </Field>
                  <Field label="메모">
                    <Cell
                      value={r.memo}
                      onChange={(v) => updateRow(i, { memo: v })}
                      placeholder="목표 / 특이사항"
                    />
                  </Field>
                  <button
                    onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                    className="h-9 w-9 grid place-items-center rounded-md text-ink-soft hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setRows((p) => [...p, emptyRow()])}
              className="h-9 px-3 rounded-full bg-white border border-border text-ink text-[12px] font-bold inline-flex items-center gap-1 hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" /> 줄 추가
            </button>
            <p className="text-[11px] text-ink-soft">이름과 11자리 휴대폰 번호가 있는 줄만 등록됩니다.</p>
          </div>

          <div className="mt-6 sticky bottom-0 -mx-6 px-6 py-4 bg-white border-t border-border">
            <button
              onClick={() => void submitBulk()}
              disabled={!trainerId || validCount === 0}
              className="w-full h-12 rounded-full bg-primary text-white text-[14px] font-extrabold inline-flex items-center justify-center gap-1.5 shadow-pop hover:brightness-110 disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              {validCount === 0 ? "이름과 휴대폰 번호를 입력해주세요" : `${validCount}명 등록하기`}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(editingStudent)}
        onOpenChange={(open) => !open && setEditingStudent(null)}
      >
        <SheetContent side="right" className="w-[88vw] sm:!max-w-[56vw] overflow-y-auto">
          <SheetHeader>
            <span className="inline-flex w-fit chip bg-primary/10 text-primary">
              <Pencil className="h-3 w-3" /> 학생 편집
            </span>
            <SheetTitle className="text-[20px] font-black leading-tight">
              {editingStudent?.name} 학생 정보
            </SheetTitle>
            <SheetDescription>수정한 내용은 학생 명단에 바로 반영됩니다.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 grid gap-4">
            <Field label="이름">
              <Cell
                value={editDraft.name}
                onChange={(v) => setEditDraft((draft) => ({ ...draft, name: v }))}
              />
            </Field>
            <Field label="전화번호">
              <Cell
                value={editDraft.phone}
                onChange={(v) =>
                  setEditDraft((draft) => ({ ...draft, phone: formatPhoneNumber(v) }))
                }
                inputMode="numeric"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="잔여">
                <Cell
                  value={editDraft.remaining}
                  onChange={(v) => setEditDraft((draft) => ({ ...draft, remaining: v }))}
                  center
                  inputMode="numeric"
                />
              </Field>
              <Field label="총">
                <Cell
                  value={editDraft.total}
                  onChange={(v) => setEditDraft((draft) => ({ ...draft, total: v }))}
                  center
                  inputMode="numeric"
                />
              </Field>
            </div>
            <Field label="메모">
              <Cell
                value={editDraft.memo}
                onChange={(v) => setEditDraft((draft) => ({ ...draft, memo: v }))}
              />
            </Field>
          </div>
          <div className="mt-8 sticky bottom-0 -mx-6 px-6 py-4 bg-white border-t border-border">
            <button
              onClick={() => void saveEdit()}
              disabled={!editDraft.name.trim()}
              className="w-full h-12 rounded-full bg-primary text-white text-[14px] font-extrabold inline-flex items-center justify-center gap-1.5 shadow-pop disabled:opacity-40"
            >
              <Check className="h-4 w-4" /> 변경사항 저장
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="max-w-[520px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">학생을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              <b className="text-ink">{deleteTarget?.name}</b> 학생이 명단에서 삭제됩니다. 삭제 후
              5초 동안 되돌릴 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && scheduleDelete(deleteTarget)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {pendingDelete && (
        <div data-bottom-floating className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
          <div className="h-14 rounded-2xl bg-ink text-white px-4 shadow-pop flex items-center justify-between gap-4">
            <span className="text-[13px] font-bold truncate">
              {pendingDelete.name} 학생이 삭제되었습니다.
            </span>
            <button
              onClick={undoDelete}
              className="shrink-0 h-9 px-3 rounded-xl bg-primary text-white text-[12px] font-extrabold inline-flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> 돌아가기
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="rounded-2xl bg-ink text-white px-4 py-3 shadow-pop flex items-center gap-2.5 min-w-[280px]">
            <span className="h-8 w-8 rounded-full bg-primary grid place-items-center">
              <Check className="h-4 w-4" />
            </span>
            <p className="text-[13px] font-extrabold">{toast}</p>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Th({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  const SortIcon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className="px-4 py-3 text-center">
      <button
        onClick={() => onSort(k)}
        className={`inline-flex w-full items-center justify-center gap-1 ${active ? "text-ink" : ""} hover:text-ink`}
      >
        {label}{" "}
        <SortIcon
          className={`h-3.5 w-3.5 ${active ? "text-primary" : "opacity-40"}`}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

function Cell({
  value,
  onChange,
  placeholder,
  center,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  center?: boolean;
  inputMode?: "numeric";
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      className={`h-9 w-full px-2 rounded-md bg-transparent border border-border focus:bg-white focus:border-ink outline-none text-[12.5px] font-semibold text-ink ${center ? "text-center tabular-nums" : ""}`}
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10.5px] font-bold uppercase tracking-wider text-ink-soft mb-0.5">
        {label}
      </span>
      {children}
    </label>
  );
}
