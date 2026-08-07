import { getCurrentUser } from '@/lib/auth/session';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { BohomMapHeader } from '@/components/layout/BohomMapHeader';
import { PageTransition } from '@/components/layout/PageTransition';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ChatSidebarSlot } from '@/components/chat/ChatSidebarSlot';
import { recordSiteVisit } from '@/lib/public/site-traffic.supabase';
import { EventPopup } from '@/components/layout/EventPopup';
import { getActiveEventPopup } from '@/lib/admin/event-popup';

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
 * 단 /chat 페이지 자체는 같은 ChatPanel을 variant="page"로 이미 전체화면 렌더링하므로,
 * ChatSidebarSlot이 그 경로에서는 사이드바를 숨겨 중복 렌더링을 막는다(W-035).
 * 태블릿/모바일(lg 미만)에서는 패널이 숨고 헤더 햄버거 메뉴의 "실시간 채팅" → /chat 페이지로
 * 대체된다. 컨테이너 좌우 패딩은 lg부터 함께 적용된다 - 패딩이 2xl부터만 붙던 이전
 * 버전에서는 lg~2xl 구간(예: 1280px)에서 우측 채팅 패널이 화면 가장자리에 여백 없이
 * 붙어 스타일 미적용처럼 보이는 버그가 있었다(W-019).
 *
 * 좌측 pc_left 배너 슬롯은 폐지했다(W-051, SPEC-004 §3) - 소재가 없을 때 "광고 영역
 * (준비 중)" 점선 박스를 노출하는 게 디자인 스펙이 금지하는 상태였고, 슬롯 자체가
 * 읽기 시작 지점을 침해해 살릴 4개 슬롯(pc_right 등)에서도 제외됐다. 빈 상태를
 * 숨기는 조건부 렌더가 아니라 aside를 통째로 제거하는 게 맞는 처리다.
 */
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const [user, , eventPopup] = await Promise.all([
    getCurrentUser(),
    // 관리자 대시보드 "오늘 방문자/오늘 조회수" 집계용 - (main) 그룹 전체(홈 포함
    // 모든 공개 페이지) 로드마다 기록된다. /admin, /partner는 이 레이아웃 밖이라
    // 관리자·파트너 자신의 방문은 집계되지 않는다.
    recordSiteVisit(),
    // 원래 루트 레이아웃에 있었으나 /admin, /partner 로그인 화면에도 함께 떠서
    // 이 레이아웃(공개 방문자 전용)으로 옮겼다(W-004).
    getActiveEventPopup(),
  ]);

  return (
    <AuthProvider initialUser={user}>
      <BohomMapHeader />
      <EventPopup config={eventPopup} />
      <div className="mx-auto flex w-full max-w-[1440px] items-start gap-6 lg:px-6">
        <main className="min-w-0 flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
        <ChatSidebarSlot currentUser={user} />
      </div>
      <SiteFooter />
    </AuthProvider>
  );
}
