import Link from 'next/link';
import { ChevronRight, FileText, LogOut } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { logoutAction } from '@/lib/actions/user-auth';
import { listMyGaChangeRequestsAction } from '@/lib/actions/ga-change-request';
import { listFavoriteBranches } from '@/lib/user/favorites';
import { listGaFilterOptions } from '@/lib/public/ga-directory';
import { BranchCard } from '@/components/branch/BranchCard';
import { ChangePasswordForm } from '@/components/mypage/ChangePasswordForm';
import { ChangeContactForm } from '@/components/mypage/ChangeContactForm';
import { GaChangeRequestForm } from '@/components/mypage/GaChangeRequestForm';
import { avatarGradient, cn } from '@/lib/utils';

// 🔴 "간편 로그인"은 쓰지 않는다(오너 확정). 카카오는 부가 수단이 아니라 회원가입·
// 로그인의 본 경로다. 구글은 웹에서 제거됐으므로 항목 자체를 두지 않는다 -
// 라벨만 남겨두면 언젠가 다시 노출된다.
const PROVIDER_LABEL: Record<string, string> = {
  kakao: '카카오 로그인',
  email: '이메일 로그인',
};

export default async function MyPage() {
  // my/layout.tsx가 이미 로그인 여부를 가드하므로 여기서는 항상 로그인된 상태다.
  const user = (await getCurrentUser())!;
  const [favorites, gaOptions, myGaChangeRequests] = await Promise.all([
    listFavoriteBranches(user.id),
    // 🔴 provider 게이트를 뺐다. 소속 GA는 로그인 수단과 무관하고, 여기서 빈 배열을
    // 주면 아래 GA 변경 폼이 "선택지 0개"로 열려 눌러도 아무것도 안 되는 화면이 된다.
    listGaFilterOptions(),
    listMyGaChangeRequestsAction(),
  ]);
  const currentGaName = gaOptions.find((o) => o.id === user.gaCompanyId)?.name ?? null;
  const pendingGaChangeRequest = myGaChangeRequests.find((r) => r.status === 'pending') ?? null;

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
          {/* 모르는 provider면 뱃지를 숨긴다. 없는 말을 지어내느니 안 보여주는 게 낫다. */}
          {PROVIDER_LABEL[user.provider] && (
            <span className="w-fit rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600">
              {PROVIDER_LABEL[user.provider]}
            </span>
          )}
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

      {/* /my/posts 라우트는 있는데 전 코드베이스에 링크가 0건이었다 - 만들어 놓고
          닿을 방법을 안 만든 상태였다. 마이페이지가 그 자리다. */}
      <Link
        href="/my/posts"
        className="flex items-center justify-between rounded-2xl border border-line bg-white px-5 py-4 shadow-card transition-colors hover:bg-surface-sunken"
      >
        <span className="flex items-center gap-2 text-[15px] font-extrabold tracking-tight text-ink">
          <FileText className="h-4 w-4 text-ink-faint" />
          내가 쓴 글
        </span>
        <ChevronRight className="h-4 w-4 text-ink-faint" />
      </Link>

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

      {/* 🔴 예전에는 셋을 하나의 provider 조건으로 묶어, 카카오 사용자에게 「계정 관리」가
          통째로 사라졌다(마이페이지에 프로필과 즐겨찾기만 남았다). 셋은 각각 조건이 다르다.
            비밀번호 변경 - 카카오 계정에는 비밀번호가 없다 → 이메일 전용
            연락처 변경   - 카카오도 가입 때 연락처를 받는다 → 공통
            소속 GA 변경  - 소속은 로그인 수단과 무관하다 → 공통
          두 공통 폼이 카카오에서 실제로 동작하는지 RPC 원문으로 확인했다:
          update_my_contact은 provider를 보지 않고, request_ga_change의 NOT_FULL_MEMBER
          게이트는 is_full_member가 카카오도 정회원으로 인정한다(kakao_verified_contact). */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-extrabold tracking-tight text-ink">계정 관리</h2>
        {user.provider === 'email' && <ChangePasswordForm />}
        <ChangeContactForm currentContact={user.contact} />
        <GaChangeRequestForm gaOptions={gaOptions} currentGaName={currentGaName} pendingRequest={pendingGaChangeRequest} />
      </section>
    </div>
  );
}
