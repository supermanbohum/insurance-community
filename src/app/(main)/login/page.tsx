import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { LoginForm } from '@/components/auth/LoginForm';
import { BrandMark } from '@/components/brand/BrandMark';

// next 경로 접두사별 목적별 안내 카피(W-005) - 어디서 로그인이 필요해 넘어왔는지 알려주면
// "왜 로그인해야 하는지" 이탈 없이 이해시킬 수 있다. 접두사가 가장 구체적인(긴) 것부터
// 매칭되도록 순서를 유지한다.
const NEXT_COPY: { prefix: string; message: string }[] = [
  { prefix: '/partner/register', message: '지점을 등록하려면 로그인이 필요합니다.' },
  { prefix: '/planner-market/register', message: '설계사 등록을 위해 로그인이 필요합니다.' },
  { prefix: '/planner-market', message: '설계사마켓 이용을 위해 로그인이 필요합니다.' },
  { prefix: '/top-designer', message: 'TOP 설계사 인증 신청을 위해 로그인이 필요합니다.' },
  { prefix: '/salary-ranking', message: '연봉 랭킹 등록을 위해 로그인이 필요합니다.' },
  { prefix: '/top-register', message: 'TOP설계사 등록을 위해 로그인이 필요합니다.' },
  { prefix: '/chat', message: '실시간 채팅을 이용하려면 로그인이 필요합니다.' },
];

function loginDescription(next: string): string {
  return NEXT_COPY.find((entry) => next.startsWith(entry.prefix))?.message ?? '즐겨찾기, 리뷰 등 회원 전용 기능을 사용해보세요.';
}

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const user = await getCurrentUser();
  // next는 "/"로 시작하는 내부 경로만 허용한다 - 외부 URL을 넘기는 오픈 리다이렉트를 막기 위함.
  const next = searchParams.next && searchParams.next.startsWith('/') ? searchParams.next : '/my';
  if (user) {
    redirect(next);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-pop">
          <BrandMark className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-extrabold tracking-tight text-ink">보험맵 로그인</h1>
        <p className="text-sm text-ink-faint">{loginDescription(next)}</p>
      </div>

      <div className="w-full max-w-sm">
        <LoginForm next={next} />
      </div>
    </div>
  );
}
