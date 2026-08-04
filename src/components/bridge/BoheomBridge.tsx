'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { registerPushTokenAction } from '@/lib/actions/push-tokens';
import type { AppToWeb, BoheomBridge as BoheomBridgeType } from '@/lib/bridge/protocol';

/**
 * 앱(WebView) ⇄ 웹 postMessage 브릿지 초기화. 앱 저장소 BRIDGE_PROTOCOL.md 8절
 * "웹팀 액션 아이템"의 최소 구현:
 *   1) window.__boheom.onNativeEvent(msg) 콜백 + send() 헬퍼
 *   2) ready 수신 시 앱 모드 전환(<html class="is-app">)
 *   3) push-token 수신 → 서버 액션으로 저장
 *   4) deeplink 수신 → Next.js 라우터로 이동
 * 일반 브라우저(앱이 아닌 경우)에서는 window.ReactNativeWebView가 없으므로
 * send()가 조용히 no-op된다 - 별도 분기 없이 항상 안전하게 호출 가능하다.
 */
export function BoheomBridge() {
  const router = useRouter();

  useEffect(() => {
    const send: BoheomBridgeType['send'] = (msg) => {
      window.ReactNativeWebView?.postMessage(JSON.stringify({ v: 1, ...msg }));
    };

    function onNativeEvent(msg: AppToWeb) {
      const bridge = window.__boheom;
      if (!bridge) return;

      switch (msg.type) {
        case 'ready':
          bridge.isApp = true;
          bridge.capabilities = msg.capabilities;
          document.documentElement.classList.add('is-app');
          if (bridge.capabilities.includes('push')) {
            send({ type: 'request-push-permission', reqId: `push-${Date.now()}` });
          }
          break;
        case 'push-token':
          registerPushTokenAction(msg.token, msg.platform).then((result) => {
            send({ type: 'push-token-ack', ok: result.success });
          });
          break;
        case 'deeplink':
          router.push(msg.path);
          break;
        default:
          break;
      }

      if ('reqId' in msg && msg.reqId) {
        bridge._resolvers[msg.reqId]?.(msg);
        delete bridge._resolvers[msg.reqId];
      }
    }

    const bridge: BoheomBridgeType = {
      isApp: false,
      capabilities: [],
      send,
      onNativeEvent,
      _resolvers: {},
    };
    window.__boheom = bridge;

    return () => {
      delete window.__boheom;
    };
  }, [router]);

  return null;
}
