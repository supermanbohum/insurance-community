'use client';

export type HapticStyle = 'light' | 'medium' | 'success' | 'selection';

interface ReactNativeWebViewBridge {
  postMessage: (message: string) => void;
}

/**
 * Android 앱(react-native-webview) 안에서 열려있을 때만 존재하는 네이티브 브릿지.
 * 일반 브라우저에서는 undefined라 아무 일도 일어나지 않는다 - 웹만 쓰는 사용자에게는
 * 완전히 no-op.
 */
export function triggerHaptic(style: HapticStyle = 'light') {
  if (typeof window === 'undefined') return;
  const bridge = (window as unknown as { ReactNativeWebView?: ReactNativeWebViewBridge }).ReactNativeWebView;
  bridge?.postMessage(JSON.stringify({ type: 'haptic', style }));
}
