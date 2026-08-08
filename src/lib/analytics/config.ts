/**
 * 전환 추적 설정(홍보일 대비) - ID가 없으면 스크립트 자체를 렌더하지 않는 no-op이다
 * (CTO 지시: "ID 도착일 = 완료일"이 되도록, 코드는 지금 완성해두고 ID만 나중에 꽂는다).
 * Meta Pixel > GA4 순으로 우선순위(광고 최적화에 실제로 쓰이는 건 픽셀).
 */
export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || null;
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || null;
