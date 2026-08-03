import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { listGaFilterOptions } from '@/lib/public/ga-directory';
import { SignupForm } from '@/components/auth/SignupForm';
import { BrandMark } from '@/components/brand/BrandMark';

export default async function SignupPage({ searchParams }: { searchParams: { next?: string } }) {
  const user = await getCurrentUser();
  // next는 "/"로 시작하는 내부 경로만 허용한다 - 외부 URL을 넘기는 오픈 리다이렉트를 막기 위함.
  const next = searchParams.next && searchParams.next.startsWith('/') ? searchParams.next : '/my';
  if (user) {
    redirect(next);
  }

  const gaOptions = await listGaFilterOptions();

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-pop">
          <BrandMark className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-extrabold tracking-tight text-ink">일반 회원가입</h1>
        <p className="text-sm text-ink-faint">가입 완료(이메일 인증) 후 실시간 채팅, 지점등록, TOP설계사 등록을 이용할 수 있어요.</p>
      </div>

      <div className="w-full max-w-sm">
        <SignupForm gaOptions={gaOptions} next={next} />
      </div>
    </div>
  );
}
