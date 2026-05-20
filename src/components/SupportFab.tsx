import { useState } from "react";
import { MessageCircle, X, Mail, Phone, MessageSquare } from "lucide-react";

/**
 * Floating bottom-right support button.
 * Opens a small panel offering 채널톡 / 카카오 채팅 / 이메일 / 전화 contact options.
 */
export function SupportFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] w-72 rounded-2xl bg-white border border-border shadow-pop p-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-extrabold text-ink">고객센터</p>
            <button onClick={() => setOpen(false)} className="h-6 w-6 grid place-items-center rounded-full hover:bg-muted text-ink-soft">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[11.5px] text-ink-soft leading-relaxed mb-3">
            궁금한 점, 버그 제보, 제휴 문의 모두 환영해요. 평일 10:00–19:00 응답.
          </p>
          <div className="grid gap-2">
            <a
              href="https://channel.io/"
              target="_blank"
              rel="noreferrer"
              className="h-10 rounded-xl bg-primary text-white text-[12.5px] font-bold inline-flex items-center justify-center gap-2 hover:brightness-110"
            >
              <MessageSquare className="h-4 w-4" /> 채널톡으로 채팅 시작
            </a>
            <a
              href="https://pf.kakao.com/"
              target="_blank"
              rel="noreferrer"
              className="h-10 rounded-xl bg-[#FEE500] text-[#191600] text-[12.5px] font-bold inline-flex items-center justify-center gap-2 hover:brightness-95"
            >
              <MessageCircle className="h-4 w-4 fill-[#191600]" /> 카카오톡 상담
            </a>
            <a
              href="mailto:help@pickgympt.kr"
              className="h-10 rounded-xl bg-white border border-border-strong text-ink text-[12.5px] font-bold inline-flex items-center justify-center gap-2 hover:bg-muted"
            >
              <Mail className="h-4 w-4" /> help@pickgympt.kr
            </a>
            <a
              href="tel:1599-0000"
              className="h-10 rounded-xl bg-white border border-border-strong text-ink text-[12.5px] font-bold inline-flex items-center justify-center gap-2 hover:bg-muted"
            >
              <Phone className="h-4 w-4" /> 1599-0000
            </a>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        title="고객센터"
        aria-label="고객센터"
        className="fixed bottom-5 right-5 z-[60] h-14 w-14 rounded-full bg-ink text-white shadow-pop grid place-items-center hover:brightness-125 active:scale-95 transition"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
