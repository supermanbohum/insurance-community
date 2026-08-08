import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { requirePartner } from '@/lib/partner/session';
import { PartnerStepIndicator } from '@/components/partner/PartnerStepIndicator';
import { Button } from '@/components/ui/button';

/**
 * 지점 등록 신청 직후 보여주는 완료 화면. OnboardingForm 제출 성공 시 여기로 이동하며,
 * 등록 폼(/partner/register)에 계속 남아있는 것처럼 보이던 문제를 없앤다.
 */
export default async function PartnerRegisterCompletePage({ searchParams }: { searchParams: { branchId?: string } }) {
  await requirePartner();
  const branchId = searchParams.branchId;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10">
      <PartnerStepIndicator status="pending" />

      <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-white p-8 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <div>
          <h1 className="text-lg font-extrabold text-ink">지점 등록이 정상적으로 접수되었습니다</h1>
          <p className="mt-1.5 text-sm text-ink-soft">운영팀 승인 후 공개됩니다.</p>
        </div>

        <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/">홈으로 이동</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href={branchId ? `/partner/branches/${branchId}` : '/partner'}>내 지점 수정</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
