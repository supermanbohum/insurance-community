import type { Metadata } from 'next';
import { requireFullMember } from '@/lib/auth/session';
import { TopPlannerApplicationForm } from '@/components/planners/TopPlannerApplicationForm';

export const metadata: Metadata = {
  title: 'TOP설계사 등록',
  description: '고소득 설계사 인증을 신청하세요. 본인 지점을 검색해 바로 신청할 수 있습니다.',
  alternates: { canonical: '/top-register' },
};

export default async function TopRegisterPage() {
  await requireFullMember('/top-register');

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-ink">TOP설계사 등록</h1>
        <p className="mt-1 text-sm text-ink-faint">
          지점등록과는 별개의 기능입니다. 본인 지점을 검색해 선택하고, 아래 정보를 입력해 신청해주세요.
          운영팀 승인 후 지점 페이지에 등급 배지가 노출됩니다.
        </p>
      </div>
      <TopPlannerApplicationForm />
    </div>
  );
}
