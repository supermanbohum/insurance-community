import { getCurrentUser } from '@/lib/auth/session';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { BohomMapHeader } from '@/components/layout/BohomMapHeader';
import { PageTransition } from '@/components/layout/PageTransition';
import { SiteFooter } from '@/components/layout/SiteFooter';

/**
 * 공개(비관리자) 페이지 전용 레이아웃 - 보험맵 헤더 + 공통 푸터를 담당한다.
 * /admin, /partner는 이 그룹 밖에 있어 이 chrome의 영향을 받지 않는다(각자
 * 전용 AdminShell/PartnerShell을 사용).
 * 커뮤니티 카테고리 서브내비(전체/공지/이슈/자유/베스트)는 (main)/community/layout.tsx가 담당한다.
 * 회원 세션은 여기서 한 번 조회해 AuthProvider로 하위 전체에 공급한다.
 * 하단 탭바는 홈 화면 아이콘 메뉴/헤더 메뉴와 기능이 중복되어 제거했다 - 스크롤 중심 구성.
 */
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <AuthProvider initialUser={user}>
      <BohomMapHeader />
      <main className="w-full">
        <PageTransition>{children}</PageTransition>
      </main>
      <SiteFooter />
    </AuthProvider>
  );
}
