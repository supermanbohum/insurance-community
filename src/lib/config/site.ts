/**
 * 서비스 브랜딩 기본값.
 *
 * 이 값들은 "기본값(fallback)"이며, 실제 운영 중에는 DB의 site_settings
 * 테이블 값이 우선 적용된다 (관리자 페이지 > 운영 설정에서 변경).
 * 코드 재배포 없이 이름/로고를 바꾸고 싶다면 site_settings를 사용하고,
 * 최초 배포 시 기본값만 여기서 바꾸면 된다.
 */
export const SITE_CONFIG = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? '보험설계사 익명 커뮤니티',
  shortName: '보슈 커뮤니티',
  description:
    '보험설계사들이 신분과 소속을 밝히지 않고 자유롭게 정보를 나누는 완전 익명 커뮤니티',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  logoPath: '/logo.svg',
  themeColor: '#2f6bff',
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
