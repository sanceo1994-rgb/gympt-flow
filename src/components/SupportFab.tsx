import { useState } from "react";
import { Instagram, Mail, MessageCircle, X } from "lucide-react";

const KAKAO_CHAT_URL =
  import.meta.env.VITE_KAKAO_CHANNEL_CHAT_URL || "https://pf.kakao.com/";
const KAKAO_CHANNEL_PUBLIC_ID = import.meta.env.VITE_KAKAO_CHANNEL_PUBLIC_ID as string | undefined;
const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;
const KAKAO_SDK_SRC = "https://developers.kakao.com/sdk/js/kakao.js";
const INSTAGRAM_URL =
  import.meta.env.VITE_INSTAGRAM_URL || "https://instagram.com/pickgympt";

type KakaoChannelSdk = {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Channel?: {
    chat: (options: { channelPublicId: string }) => void;
  };
};

function getKakaoSdk() {
  return (window as unknown as { Kakao?: KakaoChannelSdk }).Kakao;
}

let kakaoSdkPromise: Promise<void> | null = null;

function loadKakaoSdk() {
  if (typeof window === "undefined") return Promise.reject(new Error("browser only"));
  if (getKakaoSdk()) return Promise.resolve();
  if (kakaoSdkPromise) return kakaoSdkPromise;
  kakaoSdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = KAKAO_SDK_SRC;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => {
      kakaoSdkPromise = null;
      reject(new Error("Kakao SDK load failed"));
    };
    document.head.appendChild(script);
  });
  return kakaoSdkPromise;
}

/**
 * Floating bottom-right support button.
 * Opens a small panel offering 채널톡 / 카카오 채팅 / 이메일 / 전화 contact options.
 */
export function SupportFab() {
  const [open, setOpen] = useState(false);

  const openKakaoChat = async () => {
    if (KAKAO_CHANNEL_PUBLIC_ID && KAKAO_JS_KEY) {
      try {
        await loadKakaoSdk();
        const kakao = getKakaoSdk();
        if (kakao && !kakao.isInitialized()) kakao.init(KAKAO_JS_KEY);
        if (kakao?.Channel?.chat) {
          kakao.Channel.chat({ channelPublicId: KAKAO_CHANNEL_PUBLIC_ID });
          return;
        }
      } catch (error) {
        console.warn("Kakao channel chat failed; falling back to URL.", error);
      }
    }
    window.open(KAKAO_CHAT_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {open && (
        <div className="support-fab-panel fixed right-3 bottom-24 sm:right-5 sm:bottom-24 z-[60] w-72 max-w-[calc(100vw-24px)] rounded-2xl bg-white border border-border shadow-pop p-4 animate-in fade-in slide-in-from-bottom-2">
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
            <button
              type="button"
              onClick={openKakaoChat}
              className="h-10 rounded-xl bg-[#FEE500] text-[#191600] text-[12.5px] font-bold inline-flex items-center justify-center gap-2 hover:brightness-95"
            >
              <MessageCircle className="h-4 w-4 fill-[#191600]" /> 카카오톡 상담
            </button>
            <a
              href="mailto:help@pickgympt.kr"
              className="h-10 rounded-xl bg-white border border-border-strong text-ink text-[12.5px] font-bold inline-flex items-center justify-center gap-2 hover:bg-muted"
            >
              <Mail className="h-4 w-4" /> help@pickgympt.kr
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="h-10 rounded-xl bg-white border border-border-strong text-ink text-[12.5px] font-bold inline-flex items-center justify-center gap-2 hover:bg-muted"
            >
              <Instagram className="h-4 w-4" /> Instagram
            </a>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        title="고객센터"
        aria-label="고객센터"
        className="support-fab-button fixed right-3 bottom-8 sm:right-5 sm:bottom-8 z-[60] h-11 w-11 sm:h-14 sm:w-14 rounded-full bg-ink text-white shadow-pop grid place-items-center hover:brightness-125 active:scale-95 transition"
      >
        {open ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />}
      </button>
    </>
  );
}
