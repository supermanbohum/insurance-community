/**
 * 보험맵 공식 브랜드 마크 - 방패 안에 3인 실루엣(설계사 조직/신뢰를 상징).
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
  strokeWidth = 2,
}: {
  className?: string;
  /** next/og(satori)에는 CSS 엔진이 없어 className(Tailwind)이 크기에 아무 영향을 주지
   * 못한다 - 파비콘/OG 이미지 등 ImageResponse 컨텍스트에서는 반드시 width/height를
   * 숫자로 직접 넘긴다. 일반 DOM(헤더/푸터 등)에서는 className만으로 충분하다. */
  width?: number;
  height?: number;
  strokeWidth?: number;
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.72}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 3인 실루엣 - 24~40px에서도 한눈에 읽히도록 방패 테두리는 얇게, 사람 덩어리는
          최대한 크게 그린다(불투명도 차이도 뭉개져 보여서 전부 100% 불투명 처리).
          양옆 두 명을 먼저 그려 뒤로 보내고 가운데 인물을 마지막에 겹쳐 그려
          "앞에 한 명, 뒤에 두 명" 그룹감을 준다. */}
      <ellipse cx="8.1" cy="15" rx="2.5" ry="2.2" fill="currentColor" />
      <circle cx="8.1" cy="10.15" r="1.4" fill="currentColor" />
      <ellipse cx="15.9" cy="15" rx="2.5" ry="2.2" fill="currentColor" />
      <circle cx="15.9" cy="10.15" r="1.4" fill="currentColor" />
      <ellipse cx="12" cy="15.4" rx="3.6" ry="3" fill="currentColor" />
      <circle cx="12" cy="8.75" r="1.85" fill="currentColor" />
    </svg>
  );
}
