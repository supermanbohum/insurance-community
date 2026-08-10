import type { Metadata } from 'next';
import Link from 'next/link';
import { requireFullMember } from '@/lib/auth/session';
import { getMyBranchPlannerRegistrationAction } from '@/lib/actions/branch-planner-registrations';
import { BranchPlannerRegistrationForm } from '@/components/branch-planner/BranchPlannerRegistrationForm';
import { BackButton } from '@/components/shared/BackButton';

export const metadata: Metadata = {
  title: '우리 지점 설계사 수정',
  alternates: { canonical: '/branch-planner/edit' },
};

/** ③ ⓑ 수정 - 등록과 같은 폼(prefill)을 쓴다. 미등록자가 들어오면 등록 화면으로
 * 밀어넣지 않고 "아직 등록하지 않았다"는 걸 그대로 보여준다(CTO 지시 - 기존
 * /partner/branches의 "등록된 지점이 없습니다" 인라인 패턴과 통일, /planner-market/edit의
 * redirect 패턴은 따르지 않는다 - 사용자가 "수정"을 눌렀는데 다른 화면으로 튕기면
 * 자기가 어디 있는지 모르게 된다는 게 CTO 판단이었다). */
export default async function BranchPlannerEditPage() {
  const user = await requireFullMember('/branch-planner/edit');
  const registration = await getMyBranchPlannerRegistrationAction();

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10">
      <BackButton />
      <div>
        <h1 className="text-xl font-bold">우리 지점 설계사 수정</h1>
      </div>

      {!registration ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line bg-surface-sunken py-14 text-center">
          <p className="text-sm font-semibold text-ink">아직 등록하지 않으셨습니다.</p>
          <Link
            href="/branch-planner/register"
            className="mt-1 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
          >
            우리 지점 설계사 등록하기
          </Link>
        </div>
      ) : registration.status === 'approved' ? (
        <p className="rounded-2xl border border-dashed border-line bg-surface-sunken p-6 text-center text-sm text-muted-foreground">
          이미 승인된 등록입니다. 소속·직급 등 승인 정보는 운영팀 문의로 변경해주세요.
        </p>
      ) : (
        <BranchPlannerRegistrationForm
          userName={user.nickname}
          initial={{
            branch: {
              id: registration.branchId,
              name: registration.branchName,
              gaCompanyName: registration.gaCompanyName,
              sidoName: null,
              sigunguName: null,
            },
            name: registration.name,
            jobTitle: registration.jobTitle,
          }}
        />
      )}
    </div>
  );
}
