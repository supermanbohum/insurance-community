/**
 * 서비스 브랜딩 기본값.
 *
 * 이 값들은 "기본값(fallback)"이며, 실제 운영 중에는 DB의 site_settings
 * 테이블 값이 우선 적용된다 (관리자 페이지 > 운영 설정에서 변경).
 * 코드 재배포 없이 이름/로고를 바꾸고 싶다면 site_settings를 사용하고,
 * 최초 배포 시 기본값만 여기서 바꾸면 된다.
 */
export const SITE_CONFIG = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? '보험맵',
  shortName: '보험맵',
  englishName: 'BohumMap',
  description: '전국 GA·보험대리점과 보험설계사를 잇는 보험 리크루팅 지도 플랫폼',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  logoPath: '/logo.svg',
  themeColor: '#152d70',
} as const;

/**
 * 사업자/고객센터 정보 - 법적 고지(약관/개인정보처리방침/데이터 삭제/문의) 페이지와
 * 푸터가 전부 이 값을 공유한다. 사업자등록번호 등은 법적 문서 여러 곳에 흩어져
 * 있으면 나중에 하나만 바뀌었을 때 불일치가 생기기 쉬워 한 곳에서만 관리한다.
 */
export const COMPANY_INFO = {
  name: '보험슈퍼맨',
  ceo: '신한국',
  bizNo: '699-01-04079',
  address: '경기도 시흥시 시청로 25, 904호',
  email: 'dlgoghk1538@gmail.com',
  kakaoChannelUrl: 'https://open.kakao.com/o/sNMQngGi',
} as const;

export const DEFAULT_CATEGORIES = [
  { slug: 'notice', name: '공지사항', sortOrder: 0, adminOnly: true },
  { slug: 'issue', name: '보험이슈', sortOrder: 1, adminOnly: false },
  { slug: 'free', name: '자유게시판', sortOrder: 2, adminOnly: false },
] as const;

/** 관리자가 site_settings에서 바꾸지 않는 한 적용되는 기본 운영 정책값 */
export const DEFAULT_OPERATION_SETTINGS = {
  authorNameMaxLength: 12,
  allowEmojiInAuthorName: false,
  duplicateViewWindowMinutes: 30,
  postRateLimitSeconds: 60,
  postDailyLimit: 20,
  commentRateLimitSeconds: 10,
  commentDailyLimit: 100,
  reportDailyLimit: 30,
  imageMaxSizeMb: 5,
  imageMaxCountPerPost: 5,
  bestMinUpvotes: 5,
  bestMinScoreDiff: 3,
  bestMaxReports: 5,
  autoHideReportThreshold: 5,
} as const;
