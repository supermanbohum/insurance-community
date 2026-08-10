import { requireFullMember } from '@/lib/auth/session';
import { listGaFilterOptions } from '@/lib/public/ga-directory';
import { TopDesignerApplyPageForm } from '@/components/top-designer/TopDesignerApplyPageForm';
import { BackButton } from '@/components/shared/BackButton';

/** TOP 설계사 인증 신청 - 정회원이면 누구나 신청할 수 있다. 설계사마켓 프로필 유무와
 * 완전히 무관하다(오너 지시 - 마켓과 TOP은 구조적으로 분리됐다. 마켓 프로필이
 * 없으면 등록부터 하라고 안내하던 이전 로직을 제거했다). */
export default async function TopDesignerApplyPage() {
  await requireFullMember('/top-designer/apply');
  const gaOptions = await listGaFilterOptions();

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10">
      <BackButton />
      <div>
        <h1 className="text-xl font-bold">TOP 설계사 인증 신청</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          원천징수영수증으로 연봉을 증빙하면 운영팀 검토 후 별등급(⭐1억~5억) 배지와 함께 나만의 상세 페이지가 열립니다.
        </p>
      </div>
      <TopDesignerApplyPageForm gaOptions={gaOptions} />
    </div>
  );
}
