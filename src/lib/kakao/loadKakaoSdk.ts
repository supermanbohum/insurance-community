'use client';

// 카카오 개발자센터(2026-08-10 확인, developers.kakao.com/docs/latest/ko/javascript/download)
// 최신 정식 배포(2.8.2, 2026.8.6)의 official script 태그를 그대로 옮겼다 - integrity 해시는
// 문서 페이지의 렌더링된 payload에서 직접 추출했다(임의로 만든 값이 아니다). 버전이
// 올라가면 이 두 값(SDK_SRC/SDK_INTEGRITY)만 그 페이지에서 다시 복사해 바꾸면 된다.
const SDK_SCRIPT_ID = 'kakao-js-sdk';
const SDK_SRC = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.2/kakao.min.js';
const SDK_INTEGRITY = 'sha384-zt/G7/KfaRQ9dT/QIkS0ujMtzouJqzuSJcXVQu50x0rl/+mD1dc70AeOejVbMD9E';

interface KakaoShareContent {
  title: string;
  description: string;
  imageUrl: string;
  link: { mobileWebUrl: string; webUrl: string };
}

interface KakaoSdk {
  isInitialized: () => boolean;
  init: (jsKey: string) => void;
  Share: {
    sendDefault: (options: {
      objectType: 'feed';
      content: KakaoShareContent;
      buttons?: { title: string; link: { mobileWebUrl: string; webUrl: string } }[];
    }) => void;
  };
}

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

let loadPromise: Promise<KakaoSdk> | null = null;

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SDK_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('카카오 SDK 로드 실패')));
      return;
    }
    const script = document.createElement('script');
    script.id = SDK_SCRIPT_ID;
    script.src = SDK_SRC;
    script.integrity = SDK_INTEGRITY;
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error('카카오 SDK 로드 실패'));
    document.head.appendChild(script);
  });
}

/**
 * 카카오 JS SDK를 페이지 전체에서 한 번만 로드·초기화한다(여러 공유 버튼이 동시에
 * 마운트돼도 중복 삽입되지 않도록 모듈 스코프에 캐싱 - loadNaverMapsSdk와 동일 패턴).
 * JS 키는 공개 키라 프론트 노출이 정상이지만, 교체 시 재배포만으로 끝나도록
 * env var로 뺐다.
 */
/**
 * 이미 로드·초기화가 끝난 SDK만 **동기적으로** 돌려준다. 아직이면 null.
 *
 * 🔴 왜 필요한가: 클릭 핸들러에서 `await loadKakaoSdk()`를 타면 그 사이에
 * **사용자 제스처 컨텍스트가 끊긴다.** 모바일 브라우저는 제스처 없는 앱 스킴 이동·
 * 새 창을 막고 PC는 관대해서, 「웹에선 되는데 모바일에선 무반응」이 된다.
 * 그래서 공유 버튼은 마운트 시 미리 로드해 두고, 클릭 시점에는 이 함수로 꺼내 쓴다.
 */
export function getLoadedKakaoSdk(): KakaoSdk | null {
  if (typeof window === 'undefined') return null;
  const kakao = window.Kakao;
  if (!kakao) return null;
  try {
    return kakao.isInitialized() ? kakao : null;
  } catch {
    return null;
  }
}

export function loadKakaoSdk(): Promise<KakaoSdk> {
  if (loadPromise) return loadPromise;

  const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!jsKey) {
    return Promise.reject(new Error('NEXT_PUBLIC_KAKAO_JS_KEY가 설정되어 있지 않습니다.'));
  }

  loadPromise = loadScript()
    .then(() => {
      if (!window.Kakao) throw new Error('카카오 SDK가 로드되었지만 window.Kakao가 없습니다.');
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(jsKey);
      }
      return window.Kakao;
    })
    .catch((err) => {
      loadPromise = null; // 실패하면 다음 시도 때 다시 로드할 수 있게 캐시를 비운다.
      throw err;
    });

  return loadPromise;
}
