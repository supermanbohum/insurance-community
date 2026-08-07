import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicPlannerProfile } from '@/lib/public/planner-market.supabase';
import { recordPlannerProfileViewAction } from '@/lib/actions/planner-market';
import { PlannerContactUnlockButton } from '@/components/planner-market/PlannerContactUnlockButton';
import { PlannerBadgeList } from '@/components/planner-market/PlannerBadgeList';
import { BackButton } from '@/components/shared/BackButton';
import { JOB_SEARCH_STATUS_LABEL, DESIRED_START_TIMING_LABEL, CONTACTABLE_TIME_LABEL } from '@/lib/planner-market/labels';
import { Breadcrumb } from '@/components/seo/Breadcrumb';
import { JsonLd } from '@/components/seo/JsonLd';
import { plannerProfileJsonLd } from '@/lib/seo/jsonld';

// /planner-market/search와 동일한 이유(그 페이지의 주석 참고)로 force-dynamic을
// 추가한다. 가장 트래픽이 큰 진입 경로(PlannerCard 클릭)는 PlannerCard.tsx에서
// 하드 네비게이션으로 이미 우회했다.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { plannerId: string } }): Promise<Metadata> {
  const planner = await getPublicPlannerProfile(params.plannerId);
  if (!planner) return {};

  const region = planner.activeRegionLabel || '지역 미상';
  const title = `${region} · 경력 ${planner.careerYears}년 설계사`;
  const description =
    planner.selfIntroduction?.slice(0, 100) ??
    `${region}에서 활동 중인 경력 ${planner.careerYears}년차 보험설계사입니다. 연락처는 열람권으로 확인하세요.`;

  return {
    title,
    description,
    alternates: { canonical: `/planner-market/${planner.id}` },
    openGraph: { title, description },
  };
}

/** 설계사 상세(공개정보) - 누구나 열람 가능. 연락처는 PlannerContactUnlockButton을 통해서만. */
export default async function PlannerMarketDetailPage({ params }: { params: { plannerId: string } }) {
  const planner = await getPublicPlannerProfile(params.plannerId);
  if (!planner) notFound();

  await recordPlannerProfileViewAction(planner.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <JsonLd
        data={plannerProfileJsonLd({
          id: planner.id,
          activeRegionLabel: planner.activeRegionLabel,
          careerYears: planner.careerYears,
          specialties: planner.specialties,
        })}
      />
      <Breadcrumb
        items={[
          { label: '홈', href: '/' },
          { label: '설계사 마켓', href: '/planner-market' },
          { label: '설계사 찾기', href: '/planner-market/search' },
          { label: `${planner.activeRegionLabel || '지역 미상'} 설계사` },
        ]}
      />
      <BackButton />

      <div className="flex flex-col gap-1.5">
        <PlannerBadgeList badges={planner.badges} />
        <h1 className="text-lg font-bold">{planner.activeRegionLabel || '지역 미상'} · 경력 {planner.careerYears}년</h1>
        {planner.specialties.length > 0 && <p className="text-sm text-ink-soft">{planner.specialties.join(', ')}</p>}
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
