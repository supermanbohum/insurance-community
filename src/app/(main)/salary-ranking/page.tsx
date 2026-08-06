import { redirect } from 'next/navigation';

/** 연도 미지정 진입 시 올해 랭킹으로 리다이렉트 - 실제 목록/필터/더보기 로직은
 * 전부 [year]/page.tsx에 있다(URL로 특정 연도를 바로 공유할 수 있게 하기 위함). */
export default function SalaryRankingRootPage() {
  const currentYear = new Date().getFullYear();
  redirect(`/salary-ranking/${currentYear}`);
}
