import { useEffect, useState } from "react";
import { UserCog, X, LogOut, Check } from "lucide-react";

/**
 * Floating bottom-left QA persona switcher.
 * Lets developers/PMs quickly assume different identities to test branching UX
 * (trainer vs student, verified vs not, registered student vs not).
 *
 * Writes the chosen persona to localStorage["gympt-user"] so it flows through
 * `useAuth()` (see src/hooks/use-auth.ts → readVirtual).
 */

type Persona = {
  id: string;
  label: string;
  sub: string;
  badge: "trainer-verified" | "trainer" | "student-registered" | "student-other";
  user: {
    name: string;
    email: string;
    role: "trainer" | "student";
    avatar?: string;
    phone?: string;
    verified?: boolean;
  };
};

const PERSONAS: Persona[] = [
  {
    id: "trainer-100",
    label: "박재현 트레이너",
    sub: "첫 100명 인증 ✓",
    badge: "trainer-verified",
    user: {
      name: "박재현",
      email: "jaehyun.park@kakao.com",
      role: "trainer",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jaehyun&backgroundColor=ffd5dc",
      verified: true,
    },
  },
  {
    id: "trainer-new",
    label: "신규 트레이너",
    sub: "100명 이후 가입",
    badge: "trainer",
    user: {
      name: "이도현",
      email: "dohyun.new@kakao.com",
      role: "trainer",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=dohyun&backgroundColor=cde7ff",
      verified: false,
    },
  },
  {
    id: "student-registered",
    label: "김지원 학생",
    sub: "박재현 T 등록 회원",
    badge: "student-registered",
    user: {
      name: "김지원",
      email: "kim.jiwon@kakao.com",
      role: "student",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jiwon&backgroundColor=ffe1c4",
      phone: "01012345678",
    },
  },
  {
    id: "student-other",
    label: "외부 학생",
    sub: "박재현 T 미등록",
    badge: "student-other",
    user: {
      name: "정민호",
      email: "minho.guest@kakao.com",
      role: "student",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=minho&backgroundColor=d9f0d9",
      phone: "01099998888",
    },
  },
];

const BADGE_STYLE: Record<Persona["badge"], string> = {
  "trainer-verified": "bg-primary/15 text-primary",
  trainer: "bg-ink/10 text-ink",
  "student-registered": "bg-emerald-100 text-emerald-700",
  "student-other": "bg-amber-100 text-amber-700",
};

function applyPersona(p: Persona | null) {
  try {
    if (p) {
      localStorage.setItem("gympt-user", JSON.stringify(p.user));
    } else {
      localStorage.removeItem("gympt-user");
    }
    window.dispatchEvent(new Event("gympt-auth"));
  } catch {}
  // Force a clean re-render across the app
  window.location.reload();
}

function readActiveId(): string | null {
  try {
    const raw = localStorage.getItem("gympt-user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    const match = PERSONAS.find((p) => p.user.email === u.email);
    return match?.id ?? "__custom__";
  } catch {
    return null;
  }
}

export function PersonaSwitcher() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setActiveId(readActiveId());
    const onChange = () => setActiveId(readActiveId());
    window.addEventListener("gympt-auth", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("gympt-auth", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return (
    <>
      {open && (
        <div className="hidden sm:block fixed bottom-24 left-5 z-[60] w-80 rounded-2xl bg-white border border-border shadow-pop p-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[13px] font-extrabold text-ink">QA 신분 전환</p>
            <button onClick={() => setOpen(false)} className="h-6 w-6 grid place-items-center rounded-full hover:bg-muted text-ink-soft">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-ink-soft mb-3">분기별 UX를 빠르게 확인하기 위한 테스트 계정이에요.</p>
          <div className="grid gap-1.5">
            {PERSONAS.map((p) => {
              const active = activeId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => applyPersona(p)}
                  className={`w-full text-left rounded-xl border px-3 py-2.5 flex items-center gap-3 transition ${
                    active ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                  }`}
                >
                  <img src={p.user.avatar} alt="" className="h-9 w-9 rounded-full bg-muted object-cover ring-1 ring-border shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-extrabold text-ink truncate">{p.label}</p>
                    <span className={`mt-0.5 inline-flex items-center px-1.5 h-4 rounded-full text-[10px] font-bold ${BADGE_STYLE[p.badge]}`}>
                      {p.sub}
                    </span>
                  </div>
                  {active && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              );
            })}
            <button
              onClick={() => applyPersona(null)}
              className="mt-1 h-9 rounded-xl bg-white border border-border-strong text-[12px] font-bold text-ink-soft hover:bg-muted inline-flex items-center justify-center gap-2"
            >
              <LogOut className="h-3.5 w-3.5" /> 로그아웃 (비로그인 상태)
            </button>
          </div>
          <p className="mt-3 text-[10.5px] text-ink-soft leading-relaxed">
            ⚠️ 개발/테스트 전용. 운영 배포 시 자동 숨김 처리 권장.
          </p>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        title="QA 신분 전환"
        aria-label="QA 신분 전환"
        className="hidden sm:inline-flex fixed bottom-5 left-5 z-[60] h-12 px-4 rounded-full bg-ink text-white shadow-pop items-center gap-2 hover:brightness-110 active:scale-95 transition text-[12px] font-bold"
      >
        <UserCog className="h-4 w-4" />
        {activeId ? PERSONAS.find((p) => p.id === activeId)?.label ?? "Custom" : "비로그인"}
      </button>
    </>
  );
}
