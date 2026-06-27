// Loads the Kakao JavaScript SDK and wraps Kakao.Auth.login() in a promise.
// On PC, this talks to a running KakaoTalk desktop app when available; on
// mobile browsers it hands off to the KakaoTalk app the same way the SDK does
// natively. Falls back path lives in the caller (standard OAuth redirect).
declare global {
  interface Window {
    Kakao?: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Auth: {
        login: (options: {
          success: (auth: { access_token: string }) => void;
          fail: (error: unknown) => void;
        }) => void;
      };
    };
  }
}

const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;
const KAKAO_SDK_SRC = "https://developers.kakao.com/sdk/js/kakao.js";

let loadPromise: Promise<void> | null = null;

function loadKakaoSdk(): Promise<void> {
  if (window.Kakao) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = KAKAO_SDK_SRC;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("카카오 SDK를 불러오지 못했습니다."));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

export async function kakaoSdkLogin(): Promise<string> {
  if (!KAKAO_JS_KEY) {
    throw new Error("카카오 JavaScript 키가 설정되지 않았습니다.");
  }
  await loadKakaoSdk();
  if (!window.Kakao) throw new Error("카카오 SDK 초기화에 실패했습니다.");
  if (!window.Kakao.isInitialized()) window.Kakao.init(KAKAO_JS_KEY);

  return new Promise((resolve, reject) => {
    window.Kakao!.Auth.login({
      success: (auth) => resolve(auth.access_token),
      fail: (error) =>
        reject(error instanceof Error ? error : new Error("카카오 로그인이 취소되었거나 실패했습니다.")),
    });
  });
}
