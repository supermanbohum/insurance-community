import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { VerifyEmailScreen } from '@/components/auth/VerifyEmailScreen';

/**
 * "로그인은 됐지만 정회원(isFullMember)이 아닌" 사용자의 안내 화면(W-034).
 * requireFullMember 가드와 /login 페이지 둘 다 이 화면으로 보낸다 - 예전에는 이런 경우
 * /login으로 보냈는데, /login은 "이미 로그인된 사용자"를 next로 그대로 돌려보내는 페이지라
 * next가 다시 requireFullMember 가드에 걸려 /login으로 튕기는 무한 루프가 됐다.
 */
export default async function VerifyEmailPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = searchParams.next && searchParams.next.startsWith('/') ? searchParams.next : '/my';
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  if (user.isFullMember) {
    redirect(next);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <VerifyEmailScreen email={user.email} provider={user.provider} next={next} />
    </div>
  );
}
