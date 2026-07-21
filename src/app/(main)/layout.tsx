import { BohomMapHeader } from '@/components/layout/BohomMapHeader';
import { BohomMapBottomNav } from '@/components/layout/BohomMapBottomNav';

/**
 * 공개(비관리자) 페이지 전용 레이아웃 - 보험맵 헤더/하단탭을 담당한다.
 * /admin은 이 그룹 밖에 있어 이 chrome의 영향을 받지 않는다.
 * 커뮤니티 카테고리 서브내비(전체/공지/이슈/자유/베스트)는 (main)/community/layout.tsx가 담당한다.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BohomMapHeader />
      <main className="pb-mobile-nav w-full">{children}</main>
      <BohomMapBottomNav />
    </>
  );
}
