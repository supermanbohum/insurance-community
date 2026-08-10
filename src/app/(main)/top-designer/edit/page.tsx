import { notFound } from 'next/navigation';
import { requireFullMember } from '@/lib/auth/session';
import { getMyTopDesignerCertificationAction } from '@/lib/actions/top-designer';
import { listGaFilterOptions } from '@/lib/public/ga-directory';
import { TopDesignerEditForm } from '@/components/top-designer/TopDesignerEditForm';
import { BackButton } from '@/components/shared/BackButton';

export const metadata = {
  title: 'TOP 설계사 정보 수정',
  alternates: { canonical: '/top-designer/edit' },
};

/** E(오너 지시, CTO 재확인 2026-08-10) - TOP 설계사 수정 화면. 승인된 인증만 들어올
 * 수 있다(대기/보류/반려 중이면 "수정"이 아니라 원래 신청 자체를 마저 처리해야
 * 하므로 /top-designer/apply로 보낸다 - 그 화면이 이미 재신청=수정으로 동작한다). */
export default async function TopDesignerEditPage() {
  await requireFullMember('/top-designer/edit');
  const [certification, gaOptions] = await Promise.all([getMyTopDesignerCertificationAction(), listGaFilterOptions()]);

  if (!certification || certification.status !== 'approved') {
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10">
      <BackButton />
      <div>
        <h1 className="text-xl font-bold">TOP 설계사 정보 수정</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          자기소개·사진은 바로 반영됩니다. 직급·소속·연봉은 운영팀 재심사 후 반영되며, 심사 중에도 지금 공개된 정보는 그대로
          유지됩니다.
        </p>
      </div>
      <TopDesignerEditForm certification={certification} gaOptions={gaOptions} />
    </div>
  );
}
