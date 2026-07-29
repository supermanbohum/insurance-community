/**
 * next/og의 ImageResponse는 커스텀 폰트를 넘기지 않으면 내부 기본 폰트를 자체적으로
 * 찾아 로드하는데, nodejs 런타임 번들은 이 기본 폰트 경로를 Windows에서 잘못 만들어
 * "Invalid URL"로 빌드가 깨지는 알려진 버그가 있다(vercel/next.js#77164). edge
 * 런타임 + `fetch(new URL(...))` 방식(공식 문서가 권장하는 로컬 폰트 로딩 방법, fs
 * 모듈 없이 두 런타임 모두에서 동작)으로 우회한다. 한글은 쓰지 않으므로(별도 문서
 * 참고) 라틴 문자만 지원하는 가벼운 Roboto woff 둘이면 충분하다.
 */
export async function loadOgFonts() {
  const [regular, bold] = await Promise.all([
    fetch(new URL('./fonts/Roboto-Regular.woff', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('./fonts/Roboto-Bold.woff', import.meta.url)).then((r) => r.arrayBuffer()),
  ]);
  return [
    { name: 'Roboto', data: regular, style: 'normal' as const, weight: 400 as const },
    { name: 'Roboto', data: bold, style: 'normal' as const, weight: 700 as const },
  ];
}
