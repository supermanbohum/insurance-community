import type { Metadata } from 'next';
import { requireFullMember } from '@/lib/auth/session';
import { getMyBranchPlannerRegistration } from '@/lib/branch-planner/my-registration';
import { BranchPlannerRegistrationForm } from '@/components/branch-planner/BranchPlannerRegistrationForm';
import { MyRegistrationStatus } from '@/components/branch-planner/MyRegistrationStatus';
import { BackButton } from '@/components/shared/BackButton';

// 내 신청 상태를 매 요청 읽는다 - 심사 결과가 바뀌었는데 옛 화면이 남으면
// 이 페이지의 목적(상태 확인) 자체가 무너진다.
export const dynamic = 'force-dynamic';

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
  // 🔴 이미 신청한 사람이 이 화면에 와도 예전에는 **빈 폼만** 보였다. 승인/보류/반려
  // 결과를 신청자에게 보낼 수단이 없으므로(알림톡 보류), 이 화면이 상태를 보는 자리다.
  const registration = await getMyBranchPlannerRegistration();

  // 심사 대기 중이면 폼을 다시 보여주지 않는다 - 같은 신청을 한 건 더 만들게 되고,
  // 지점 관리자의 대기열에 중복 행이 쌓인다. 지금 사용자가 할 일은 없다.
  const showForm = registration === null || registration.status === 'on_hold' || registration.status === 'rejected';

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10">
      <BackButton />
      <div>
        <h1 className="text-xl font-bold">우리 지점 설계사 등록</h1>
      </div>
      {registration && <MyRegistrationStatus registration={registration} />}
      {showForm && <BranchPlannerRegistrationForm userName={user.nickname} />}
    </div>
  );
}
