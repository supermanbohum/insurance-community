import { LogOut } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { logoutAction } from '@/lib/actions/user-auth';
import { listFavoriteBranches } from '@/lib/user/favorites';
import { BranchCard } from '@/components/branch/BranchCard';
import { avatarGradient, cn } from '@/lib/utils';

const PROVIDER_LABEL: Record<string, string> = {
  kakao: '카카오',
  google: 'Google',
  email: '이메일',
};

export default async function MyPage() {
  // my/layout.tsx가 이미 로그인 여부를 가드하므로 여기서는 항상 로그인된 상태다.
  const user = (await getCurrentUser())!;
  const favorites = await listFavoriteBranches(user.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <section className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5 shadow-card">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-sunken">
          {user.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.profileImage} alt={user.nickname} className="h-full w-full object-cover" />
          ) : (
            <span
              className={cn(
                'flex h-full w-full items-center justify-center bg-gradient-to-br text-xl font-extrabold text-white/90',
                avatarGradient(user.nickname)
              )}
            >
              {user.nickname.slice(0, 1)}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-base font-extrabold text-ink">{user.nickname}</p>
          {user.email && <p className="truncate text-xs text-ink-faint">{user.email}</p>}
          <span className="w-fit rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600">
            {PROVIDER_LABEL[user.provider] ?? user.provider} 로그인
          </span>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex shrink-0 items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-surface-sunken"
          >
            <LogOut className="h-3.5 w-3.5" />
            로그아웃
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold tracking-tight text-ink">
          즐겨찾기
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-600">{favorites.length}</span>
        </h2>
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line py-14 text-ink-faint">
            <p className="text-sm">아직 즐겨찾기한 지점이 없습니다.</p>
            <p className="text-xs">지점 상세페이지에서 하트를 눌러 추가해보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {favorites.map((branch) => (
              <BranchCard key={branch.id} branch={branch} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
