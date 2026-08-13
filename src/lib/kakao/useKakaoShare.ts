'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { loadKakaoSdk, getLoadedKakaoSdk } from '@/lib/kakao/loadKakaoSdk';

export interface KakaoShareContentInput {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
}

/**
 * 카카오 공유 - 안 되는 환경에서 **무반응으로 끝나지 않게** 세 단계로 내려간다.
 *
 * ---------------------------------------------------------------------------
 * 🔴 왜 고쳤나 - "웹에선 되는데 앱·모바일 웹에선 눌러도 무반응"(오너 2026-08-13)
 * ---------------------------------------------------------------------------
 * 운영에서 재현해 확인한 것(모바일 UA, bohummap.com):
 *
 *     SDK 스크립트 로드    ✅        window.Kakao        ✅
 *     Kakao.isInitialized() true     Kakao.Share 존재     ✅
 *     sendDefault 호출     예외 없음 · 반환 undefined
 *     그 뒤                URL 변화 없음 · 화면 전환 시도 없음 · 콘솔 에러 0건 · 토스트 0건
 *
 * 즉 **JS 키·도메인 문제가 아니다**(초기화가 통과한다). 그리고 `sendDefault`는
 * **실패해도 예외를 안 던지고 반환값도 없다** - 그래서 예전 코드의 try/catch와
 * 에러 토스트는 이 실패를 **구조적으로 절대 잡을 수 없었다.** 사용자에게는 무반응이다.
 *
 * 고친 것 둘:
 *
 * ① **SDK를 클릭 전에 미리 로드한다.**
 *    예전에는 `await loadKakaoSdk()` **뒤에** sendDefault를 불렀다. 첫 클릭에서는
 *    스크립트를 네트워크로 받는 동안 **사용자 제스처 컨텍스트가 끊긴다.** 모바일
 *    브라우저는 제스처 없는 앱 스킴 이동·새 창을 막고 **PC는 관대하다** - "웹에선 되는데
 *    모바일에선 안 된다"와 정확히 같은 모양이다. 미리 로드해 두면 클릭 시점에는
 *    동기적으로 꺼내 쓰므로 제스처가 유지된다.
 *
 * ② **성공 신호가 없으면 대안을 준다.**
 *    카카오가 성공하면 앱/새 창으로 **화면을 벗어난다**(visibilitychange 또는 blur).
 *    그 신호가 일정 시간 안에 없으면 실패로 보고 네이티브 공유 시트 →
 *    링크 복사 순으로 내려간다. 🔴 휴리스틱이다 - 성공/실패를 직접 알 방법이 없어서
 *    **이탈 여부로 대신 재는 것**이고, 그 사실을 여기 적어 둔다.
 *
 * ⚠️ 실기기(오너 폰·앱 WebView)에서는 확인하지 못했다. 확인한 것은 "모바일 UA
 * 브라우저에서 sendDefault가 조용히 아무것도 안 한다"까지다. 앱(WebView)은 원인이
 * 다를 수 있다 - WebView가 `kakaolink://`·`intent://`를 처리하지 못하면 같은 증상이
 * 나고, 그건 앱 셸이 외부 스킴을 허용해야 풀린다(앱 세션 확인 필요).
 * 다만 어느 쪽이든 **이제 무반응으로 끝나지는 않는다.**
 */
const EXIT_SIGNAL_TIMEOUT_MS = 1200;

export function useKakaoShare({ title, description, imageUrl, url }: KakaoShareContentInput) {
  const [isPending, setIsPending] = useState(false);

  // 🔴 클릭을 기다리지 않고 미리 받아 둔다(위 ① 참고). 실패해도 조용히 넘긴다 -
  // 이 시점에 사용자는 공유를 누른 적이 없어서 알릴 일이 아니고, 클릭 때 다시 시도한다.
  useEffect(() => {
    loadKakaoSdk().catch(() => undefined);
  }, []);

  async function share() {
    setIsPending(true);
    try {
      // ── ① 카카오 공유 ────────────────────────────────────────────────────
      // 이미 로드된 경우에만 동기적으로 꺼낸다. await를 타면 제스처가 끊긴다.
      const kakao = getLoadedKakaoSdk();
      if (kakao) {
        const exited = watchForExit();
        try {
          kakao.Share.sendDefault({
            objectType: 'feed',
            content: { title, description, imageUrl, link: { mobileWebUrl: url, webUrl: url } },
            buttons: [{ title: '자세히 보기', link: { mobileWebUrl: url, webUrl: url } }],
          });
        } catch (err) {
          console.error('[useKakaoShare] sendDefault 실패', err);
        }
        if (await exited) return; // 카톡/새 창으로 넘어갔다 - 여기서 끝
      }

      // ── ② 네이티브 공유 시트 ─────────────────────────────────────────────
      // 모바일에서 가장 확실한 경로다. 카카오톡도 이 시트에 뜬다.
      // ⚠️ 카드 형태(이미지+버튼)는 카카오 전용이라 여기서는 링크만 간다.
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({ title, text: description, url });
          return;
        } catch (err) {
          // 사용자가 시트를 닫은 것도 여기로 온다. 그건 실패가 아니라 취소다.
          if (err instanceof DOMException && err.name === 'AbortError') return;
          console.error('[useKakaoShare] navigator.share 실패', err);
        }
      }

      // ── ③ 링크 복사 ──────────────────────────────────────────────────────
      // 🔴 마지막 단계는 반드시 성공해야 한다. 여기까지 와서 또 조용하면 무반응이다.
      await copyLink(url);
    } finally {
      setIsPending(false);
    }
  }

  return { share, isPending };
}

/**
 * 화면을 벗어났는지 지켜본다 - 카카오 공유가 성공하면 카톡 앱이나 새 창으로 넘어간다.
 * 🔴 성공을 직접 알 수 없어서 **이탈로 대신 잰다.** 시간 안에 아무 신호가 없으면 false.
 */
function watchForExit(): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (exited: boolean) => {
      if (done) return;
      done = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      clearTimeout(timer);
      resolve(exited);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') finish(true);
    };
    const onBlur = () => finish(true);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    const timer = setTimeout(() => finish(false), EXIT_SIGNAL_TIMEOUT_MS);
  });
}

async function copyLink(url: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      // clipboard API는 안전 컨텍스트·권한이 필요하다. 막히면 옛 방식으로 넘어간다.
      const area = document.createElement('textarea');
      area.value = url;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    toast.success('링크를 복사했습니다. 카카오톡에 붙여넣어 보내주세요.');
  } catch (err) {
    console.error('[useKakaoShare] 링크 복사 실패', err);
    // 🔴 여기까지 오면 알려줄 수단이 토스트뿐이다. 주소를 그대로 띄워 직접 복사하게 한다.
    toast.error(`공유를 열지 못했습니다. 이 주소를 복사해주세요: ${url}`);
  }
}
