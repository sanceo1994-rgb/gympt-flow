import { ChevronDown } from "lucide-react";
import { useState } from "react";

const LINKS = [
  { label: "이용약관", href: "/" },
  { label: "개인정보처리방침", href: "/" },
  { label: "환불정책", href: "/" },
  { label: "광고/협업 문의", href: "mailto:pickgympt@gmail.com" },
];

export function LegalLinks({ compact = false }: { compact?: boolean }) {
  const [bizOpen, setBizOpen] = useState(false);
  return (
    <div className={`${compact ? "text-[10.5px]" : "text-[11px]"} text-ink-soft`}>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {LINKS.map((link, index) => (
          <span key={link.label} className="inline-flex items-center gap-2">
            {index > 0 && <span className="text-border">·</span>}
            <a href={link.href} className="hover:text-ink">
              {link.label}
            </a>
          </span>
        ))}
      </div>
      <button
        onClick={() => setBizOpen((value) => !value)}
        className="mx-auto mt-2 flex items-center gap-1 text-[10.5px] text-ink-soft hover:text-ink"
      >
        사업자정보 보기
        <ChevronDown className={`h-3 w-3 transition ${bizOpen ? "rotate-180" : ""}`} />
      </button>
      {bizOpen && (
        <div className="mt-2 rounded-lg border border-border bg-white p-3 text-left text-[10.5px] leading-relaxed">
          <p>
            <b className="text-ink">상호</b> 픽짐피티 주식회사
          </p>
          <p>
            <b className="text-ink">대표</b> 김재성
          </p>
          <p>
            <b className="text-ink">사업자등록번호</b> 596-81-03128
          </p>
          <p>
            <b className="text-ink">주소</b> 서울시 마포구 서강로 22, 2층 4호
          </p>
          <p>
            <b className="text-ink">고객센터</b> pickgympt@gmail.com
          </p>
          <p className="mt-1.5 text-ink-soft/70">© 2026 PickGymPT</p>
        </div>
      )}
    </div>
  );
}
