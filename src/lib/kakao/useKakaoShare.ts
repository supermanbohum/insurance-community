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
 * ② **SDK가 없거나 예외가 났을 때만** 네이티브 공유 시트 → 링크 복사로 내려간다.
 *
 * ---------------------------------------------------------------------------
 * 🔴 2026-08-14 정정 - 성공을 실패로 판정하고 있었다 (오너 실기기 스크린샷)
 * ---------------------------------------------------------------------------
 * 위 ②는 원래 「1.2초 안에 visibilitychange/blur가 오면 성공」이라는 휴리스틱
 * (`watchForExit`)이었다. **틀린 전제였다.**
 * 카카오 공유는 성공하면 **페이지 위에 친구 선택 시트를 띄운다** - 페이지를 숨기지도
 * 않고 포커스를 뺏지도 않는다. 그래서 오너 화면에서는 **친구 선택 시트가 열린 채로**
 * 「공유를 열지 못했습니다…」 토스트가 같이 떴다. 공유는 되고 있었는데 우리가 실패라고
 * 말한 것이다. 이탈은 성공의 신호가 아니었다.
 *
 * 지금 기준: **SDK가 로드돼 있고 `sendDefault`가 예외를 던지지 않았으면 성공으로 보고
 * 즉시 끝낸다.** 폴백은 ⓐ `getLoadedKakaoSdk()`가 null ⓑ `sendDefault`가 예외를 던짐,
 * 이 둘뿐이다.
 *
 * ⚠️ 이 판정도 완벽하지 않다는 것을 안다 - `sendDefault`는 실패해도 예외를 안 던질 수
 * 있어서, 그런 경우는 다시 무반응이 된다. 그럼에도 이쪽을 고른 이유는:
 * **되는 사람에게 매번 거짓 실패를 보여주는 쪽이 더 나쁘기 때문**이다. 무반응은 다시
 * 누르게 하지만, 거짓 경고는 되는 기능을 안 되는 기능으로 믿게 만든다.
 * 🔴 폴백 문구 자체는 지우지 않았다 - 지우면 ⓐ·ⓑ 진짜 실패가 무반응으로 회귀한다.
 *
 * ⚠️ 앱(WebView)은 여전히 원인이 다를 수 있다 - WebView가 `kakaolink://`·`intent://`를
 * 처리하지 못하면 같은 증상이 나고, 그건 앱 셸이 외부 스킴을 허용해야 풀린다.
 */

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
        try {
          kakao.Share.sendDefault({
            objectType: 'feed',
            content: { title, description, imageUrl, link: { mobileWebUrl: url, webUrl: url } },
            buttons: [{ title: '자세히 보기', link: { mobileWebUrl: url, webUrl: url } }],
          });
          // 🔴 여기서 끝낸다. 친구 선택 시트는 페이지 위에 뜨므로 이탈 신호가 오지 않는다 -
          // 예전에는 그 신호가 없다고 아래 폴백으로 내려가 **열려 있는 시트 위에 실패
          // 토스트**를 띄웠다. 예외가 없었으면 성공으로 본다(위 머리말 참고).
          return;
        } catch (err) {
          console.error('[useKakaoShare] sendDefault 실패', err);
          // 예외가 났을 때만 아래로 내려간다.
        }
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
 * 🔴 `watchForExit`를 여기서 들어냈다(2026-08-14). 「1.2초 안에 이탈 신호가 없으면 실패」로
 * 재던 함수인데, 카카오 친구 선택 시트는 이탈을 만들지 않으므로 **성공을 실패로 판정**했다.
 * 목적을 달성하지 못하는 장치라 되살리지 마라 - 되살리면 오너가 본 그 화면
 * (시트가 열린 채 「공유를 열지 못했습니다」)이 그대로 돌아온다.
 */

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
    // ⚠️ 이 경로는 **카카오톡 인앱 브라우저에서 실제로 밟힌다** - 거기서는 clipboard API도
    // execCommand('copy')도 막혀서 "최후 수단"이 실은 작동하지 않는다. 그래서 기본
    // 4초로 사라지면 사용자가 주소를 옮겨 적을 시간이 없다. 직접 길게 눌러 복사할 수
    // 있도록 오래 띄운다(닫기 전까지가 아니라, 충분히 긴 시간).
    toast.error(`공유를 열지 못했습니다. 이 주소를 복사해주세요: ${url}`, { duration: 20000 });
  }
}
