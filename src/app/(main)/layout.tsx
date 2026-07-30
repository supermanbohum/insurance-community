import { getCurrentUser } from '@/lib/auth/session';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { BohomMapHeader } from '@/components/layout/BohomMapHeader';
import { PageTransition } from '@/components/layout/PageTransition';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ChatPanel } from '@/components/chat/ChatPanel';

/**
 * 공개(비관리자) 페이지 전용 레이아웃 - 보험맵 헤더 + 공통 푸터를 담당한다.
 * /admin, /partner는 이 그룹 밖에 있어 이 chrome의 영향을 받지 않는다(각자
 * 전용 AdminShell/PartnerShell을 사용).
 * 커뮤니티 카테고리 서브내비(전체/공지/이슈/자유/베스트)는 (main)/community/layout.tsx가 담당한다.
 * 회원 세션은 여기서 한 번 조회해 AuthProvider로 하위 전체에 공급한다.
 * 하단 탭바는 홈 화면 아이콘 메뉴/헤더 메뉴와 기능이 중복되어 제거했다 - 스크롤 중심 구성.
 *
 * PC(lg 이상)에서는 우측에 채팅 패널이 항상 고정 노출된다 - 이 레이아웃이 (main) 그룹의
 * 모든 페이지(홈 포함)를 감싸므로, 페이지 이동 시에도 리마운트되지 않고 그대로 유지된다.
 * 태블릿/모바일(lg 미만)에서는 패널이 숨고 헤더 햄버거 메뉴의 "실시간 채팅" → /chat 페이지로
 * 대체된다. 2xl 이상 초광폭 화면에서만 좌측에 향후 광고 영역을 위한 자리를 비워둔다.
 */
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <AuthProvider initialUser={user}>
      <BohomMapHeader />
      <div className="mx-auto flex w-full max-w-[1440px] items-start gap-6 2xl:px-6">
        <aside className="hidden w-[240px] shrink-0 2xl:block">
          <div className="sticky top-[76px] rounded-2xl border border-dashed border-line bg-surface-sunken py-10 text-center text-xs text-ink-faint">
            광고 영역
            <br />
            (준비 중)
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
        <aside className="hidden w-[340px] shrink-0 lg:block">
          <div className="sticky top-[76px] h-[calc(100vh-96px)] py-3">
            <ChatPanel currentUser={user} variant="sidebar" />
          </div>
        </aside>
      </div>
      <SiteFooter />
    </AuthProvider>
  );
}
