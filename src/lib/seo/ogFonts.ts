/**
 * next/og의 ImageResponse는 커스텀 폰트를 넘기지 않으면 내부 기본 폰트를 자체적으로
 * 찾아 로드하는데, nodejs 런타임 번들은 이 기본 폰트 경로를 Windows에서 잘못 만들어
 * "Invalid URL"로 빌드가 깨지는 알려진 버그가 있다(vercel/next.js#77164). edge
 * 런타임 + `fetch(new URL(...))` 방식(공식 문서가 권장하는 로컬 폰트 로딩 방법, fs
 * 모듈 없이 두 런타임 모두에서 동작)으로 우회한다. 한글은 쓰지 않으므로(별도 문서
 * 참고) 라틴 문자만 지원하는 가벼운 Roboto woff 둘이면 충분하다.
 */
// 🔴 이 파일과 ./fonts/Roboto-*.woff 를 지우지 말 것.
// 표시용이 아니다. OG 이미지에 글자가 한 자도 없어도(문구를 PNG로 넣는 A2 방식) fonts
// 배열은 계속 넘겨야 한다 - 안 넘기면 위 주석의 Windows 빌드 버그가 그대로 재현된다.
// "글자가 없으니 폰트도 필요 없다"고 읽고 지우면 로컬 빌드가 깨지고 원인을 찾기 어렵다.
//
// 🔴 라이선스: Roboto는 SIL Open Font License 1.1이다(Apache 2.0이 아니다).
// 폰트 "파일"을 저장소에 두고 배포하므로 OFL 조건 2(저작권 고지 + 라이선스 사본 동봉)가
// 적용된다. 폰트 내부 메타데이터에는 저작권(nameID 0)만 있고 라이선스 전문(nameID 13)이
// 비어 있어, 같은 폴더의 OFL.txt가 그 사본이다. 그 파일도 지우면 안 되고 편집해서도 안 된다.
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
