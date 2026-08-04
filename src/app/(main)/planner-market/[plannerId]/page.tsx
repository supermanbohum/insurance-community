import Image from 'next/image';
import { notFound } from 'next/navigation';
import { User } from 'lucide-react';
import { getPublicPlannerProfile } from '@/lib/public/planner-market.supabase';
import { recordPlannerProfileViewAction } from '@/lib/actions/planner-market';
import { PlannerContactUnlockButton } from '@/components/planner-market/PlannerContactUnlockButton';
import { PlannerBadgeList } from '@/components/planner-market/PlannerBadgeList';
import { BackButton } from '@/components/shared/BackButton';
import { avatarGradient } from '@/lib/utils';
import { JOB_SEARCH_STATUS_LABEL, DESIRED_START_TIMING_LABEL, CONTACTABLE_TIME_LABEL } from '@/lib/planner-market/labels';

/** 설계사 상세(공개정보) - 누구나 열람 가능. 연락처는 PlannerContactUnlockButton을 통해서만. */
export default async function PlannerMarketDetailPage({ params }: { params: { plannerId: string } }) {
  const planner = await getPublicPlannerProfile(params.plannerId);
  if (!planner) notFound();

  await recordPlannerProfileViewAction(planner.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <BackButton />

      <div className="flex items-start gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-surface-sunken">
          {planner.profilePhotoUrl ? (
            <Image src={planner.profilePhotoUrl} alt="프로필 사진" fill sizes="96px" className="object-cover" />
          ) : (
            <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br text-white/85 ${avatarGradient(planner.id)}`}>
              <User className="h-9 w-9" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <PlannerBadgeList badges={planner.badges} />
          <h1 className="text-lg font-bold">{planner.activeRegionLabel || '지역 미상'} · 경력 {planner.careerYears}년</h1>
          {planner.specialties.length > 0 && <p className="text-sm text-ink-soft">{planner.specialties.join(', ')}</p>}
        </div>
      </div>

      <PlannerContactUnlockButton plannerProfileId={planner.id} />

      {planner.selfIntroduction && (
        <section className="rounded-2xl border border-line p-4">
          <h2 className="mb-2 text-sm font-bold">자기소개</h2>
          <p className="whitespace-pre-line text-sm text-ink-soft">{planner.selfIntroduction}</p>
        </section>
      )}

      <section className="rounded-2xl border border-line p-4">
        <h2 className="mb-3 text-sm font-bold">프로필 정보</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <InfoItem label="현재 근무 여부" value={planner.currentlyEmployed ? '재직중' : '미재직'} />
          <InfoItem label="현재 상태" value={JOB_SEARCH_STATUS_LABEL[planner.jobSearchStatus]} />
          <InfoItem label="희망 입사 시기" value={planner.desiredStartTiming ? DESIRED_START_TIMING_LABEL[planner.desiredStartTiming] : '-'} />
          <InfoItem
            label="연락 가능 시간"
            value={
              planner.contactableTimes.length > 0
                ? planner.contactableTimes.map((t) => CONTACTABLE_TIME_LABEL[t as keyof typeof CONTACTABLE_TIME_LABEL] ?? t).join(', ')
                : '-'
            }
          />
          <InfoItem label="희망 근무지역" value={planner.desiredRegionLabel ?? '-'} />
          <InfoItem label="희망 GA" value={planner.desiredGaCompanyName ?? '-'} />
        </dl>
        {planner.desiredConditions && (
          <div className="mt-3 border-t pt-3">
            <p className="mb-1 text-xs text-muted-foreground">희망 조건</p>
            <p className="whitespace-pre-line text-sm">{planner.desiredConditions}</p>
          </div>
        )}
      </section>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
