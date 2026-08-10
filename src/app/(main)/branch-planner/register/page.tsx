import type { Metadata } from 'next';
import { requireFullMember } from '@/lib/auth/session';
import { BranchPlannerRegistrationForm } from '@/components/branch-planner/BranchPlannerRegistrationForm';
import { BackButton } from '@/components/shared/BackButton';

export const metadata: Metadata = {
  title: '우리 지점 설계사 등록',
  description: '소속 지점을 연결하고 설계사로 등록하세요. 명함은 필수, 소득증빙은 선택입니다.',
  alternates: { canonical: '/branch-planner/register' },
};

/** ③ ⓑ 우리 지점 설계사 등록(오너 지시, 2026-08-10) - 지점 연결이 필수인 게 설계사마켓
 * 등록과의 결정적 차이다. 지점을 못 찾으면 하드 게이트(BranchPlannerGate)로 막되,
 * 지점장에게 전달할 수 있는 전환 경로를 함께 준다. */
export default async function BranchPlannerRegisterPage() {
  const user = await requireFullMember('/branch-planner/register');

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10">
      <BackButton />
      <div>
        <h1 className="text-xl font-bold">우리 지점 설계사 등록</h1>
      </div>
      <BranchPlannerRegistrationForm userName={user.nickname} />
    </div>
  );
}
