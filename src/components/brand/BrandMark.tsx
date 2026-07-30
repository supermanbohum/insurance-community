/**
 * 보험맵 공식 브랜드 마크 - 대한민국 지도 실루엣 + 제주도(점 하나)로 "전국을 잇는
 * 보험 지도 플랫폼"을 표현한다(방패/체크마크 모티프 폐기).
 * 헤더/푸터/파비콘/OG 이미지/404/로그인 등 "브랜드 배지" 자리에서 전부 이 컴포넌트
 * 하나만 사용한다 - 로고를 두 곳 이상에 손코딩하면 나중에 갱신이 어긋난다.
 * currentColor를 써서 부모가 지정한 텍스트 색(보통 gradient 배지 위 흰색)을 그대로 따른다.
 * next/og의 ImageResponse(favicon, OG 이미지)에서도 satori가 일반 함수 컴포넌트를
 * 그대로 렌더링하므로 동일하게 재사용 가능하다.
 */
export function BrandMark({
  className,
  width,
  height,
}: {
  className?: string;
  /** next/og(satori)에는 CSS 엔진이 없어 className(Tailwind)이 크기에 아무 영향을 주지
   * 못한다 - 파비콘/OG 이미지 등 ImageResponse 컨텍스트에서는 반드시 width/height를
   * 숫자로 직접 넘긴다. 일반 DOM(헤더/푸터 등)에서는 className만으로 충분하다. */
  width?: number;
  height?: number;
}) {
  return (
    <svg
      viewBox="0 0 100 130"
      fill="currentColor"
      className={className}
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M62 4 C72 4 79 10 79 19 C79 27 74 31 67 37 C78 41 82 52 79 64 C76 76 68 88 60 96 C53 103 48 108 46 116 C42 106 38 100 34 94 C26 84 21 74 25 62 C20 58 17 50 20 42 C17 34 20 26 28 22 C34 19 38 24 44 24 C46 16 52 8 62 4 Z" />
      <ellipse cx="50" cy="122" rx="7" ry="4" />
    </svg>
  );
}
