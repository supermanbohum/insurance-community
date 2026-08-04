/**
 * 앱 ⇄ 웹 postMessage 브릿지 타입 정의. 앱 저장소의 BRIDGE_PROTOCOL.md와 반드시
 * 동일하게 유지해야 하는 "계약" 파일이다 - 한쪽만 고치면 브릿지가 깨진다.
 * 이 타입을 바꿀 때는 WEB_MASTER_ROADMAP.md도 함께 확인할 것.
 */

export type HapticStyle = 'light' | 'medium' | 'success' | 'error' | 'selection';

export type Capability =
  | 'haptic'
  | 'push'
  | 'deeplink'
  | 'share'
  | 'biometric'
  | 'qr-scan'
  | 'qr-generate'
  | 'image-pick'
  | 'badge'
  | 'clipboard';

/** 웹 → 앱. window.__boheom.send(msg)로 전송된다. */
export type WebToApp =
  | { v: 1; type: 'haptic'; style: HapticStyle }
  | { v: 1; type: 'request-push-permission'; reqId: string }
  | { v: 1; type: 'push-token-ack'; ok: boolean }
  | { v: 1; type: 'navigate'; path: string }
  | { v: 1; type: 'share'; url: string; title?: string; message?: string }
  | { v: 1; type: 'copy-to-clipboard'; text: string }
  | { v: 1; type: 'request-biometric'; reqId: string; reason?: string }
  | { v: 1; type: 'set-biometric-lock'; enabled: boolean }
  | { v: 1; type: 'open-qr-scanner'; reqId: string }
  | { v: 1; type: 'generate-qr'; reqId: string; value: string }
  | { v: 1; type: 'pick-image'; reqId: string; source: 'camera' | 'library' }
  | { v: 1; type: 'set-badge'; count: number }
  | { v: 1; type: 'toast'; message: string }
  | { v: 1; type: 'set-status-bar'; style: 'dark' | 'light' }
  | { v: 1; type: 'keep-awake'; enabled: boolean }
  | { v: 1; type: 'log'; level: 'info' | 'warn' | 'error'; message: string };

/** 앱 → 웹. window.__boheom.onNativeEvent(msg)로 주입된다. */
export type AppToWeb =
  | { v: 1; type: 'ready'; platform: 'ios' | 'android'; appVersion: string; capabilities: Capability[] }
  | { v: 1; type: 'push-token'; reqId?: string; token: string; platform: 'ios' | 'android' }
  | { v: 1; type: 'push-permission-denied'; reqId?: string }
  | { v: 1; type: 'deeplink'; path: string; source: 'notification' | 'link' | 'cold-start' }
  | { v: 1; type: 'notification-received'; data: Record<string, unknown> }
  | { v: 1; type: 'biometric-result'; reqId: string; ok: boolean; error?: string }
  | { v: 1; type: 'qr-result'; reqId: string; value: string }
  | { v: 1; type: 'qr-cancelled'; reqId: string }
  | { v: 1; type: 'qr-generated'; reqId: string; dataUrl: string }
  | { v: 1; type: 'image-picked'; reqId: string; uri: string; base64?: string; mime: string }
  | { v: 1; type: 'app-state'; state: 'active' | 'background' | 'inactive' }
  | { v: 1; type: 'network'; online: boolean }
  | { v: 1; type: 'back-pressed' };

/** 유니온 타입의 각 멤버에서 개별적으로 키를 제거한다 - 일반 Omit은 유니온에 쓰면
 * 공통 키만 남아 대부분의 필드가 사라진다. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export interface BoheomBridge {
  isApp: boolean;
  capabilities: Capability[];
  send: (msg: DistributiveOmit<WebToApp, 'v'>) => void;
  onNativeEvent: (msg: AppToWeb) => void;
  /** request-biometric/open-qr-scanner 등 reqId 기반 요청의 대기 중인 Promise resolver. */
  _resolvers: Record<string, (msg: AppToWeb) => void>;
}

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
    __boheom?: BoheomBridge;
  }
}
