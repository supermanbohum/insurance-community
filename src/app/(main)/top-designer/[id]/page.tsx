import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicTopDesigner } from '@/lib/public/top-designer.supabase';
import { recordTopDesignerViewAction } from '@/lib/actions/top-designer';
import { getCurrentUser } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { STAR_TIER_LABEL } from '@/lib/top-designer/labels';
import { TopDesignerLikeButton } from '@/components/top-designer/TopDesignerLikeButton';
import { TopDesignerBusinessCardDownload } from '@/components/top-designer/TopDesignerBusinessCardDownload';
import { BackButton } from '@/components/shared/BackButton';
import { User, Eye } from 'lucide-react';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const designer = await getPublicTopDesigner(params.id);
  if (!designer) return {};
  const title = `${STAR_TIER_LABEL[designer.starTier]} · ${designer.activeRegionLabel} TOP 설계사`;
  return { title, alternates: { canonical: `/top-designer/${designer.id}` } };
}

/** 명함(실명 포함) 다운로드는 본인만 볼 수 있다 - planner_profiles.name은 이
 * 코드베이스 전체에서 GA 열람권 없이는 절대 공개되지 않는 비공개 필드라, 공개
 * 상세페이지에는 실명을 노출하지 않고 본인 로그인 시에만 자신의 명함을 만들 수 있게 한다. */
async function getOwnerNameIfViewerIsOwner(plannerProfileId: string): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.rpc('get_my_planner_market_profile');
  const own = data?.find((row) => row.id === plannerProfileId);
  return own?.name ?? null;
}

export default async function TopDesignerDetailPage({ params }: { params: { id: string } }) {
  const designer = await getPublicTopDesigner(params.id);
  if (!designer) notFound();

  await recordTopDesignerViewAction(designer.id);
  const ownerName = await getOwnerNameIfViewerIsOwner(designer.plannerProfileId);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <BackButton />

      <div className="flex items-start gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-surface-sunken">
          {designer.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={designer.profilePhotoUrl} alt="프로필 사진" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 text-white/85">
              <User className="h-9 w-9" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="w-fit rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
            {STAR_TIER_LABEL[designer.starTier]} · 보험맵 공식 인증
          </span>
          <h1 className="text-lg font-bold">
            {designer.activeRegionLabel} · 경력 {designer.careerYears}년
          </h1>
          {designer.specialties.length > 0 && <p className="text-sm text-ink-soft">{designer.specialties.join(', ')}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <TopDesignerLikeButton certificationId={designer.id} initialLikeCount={designer.likeCount} />
        <span className="flex items-center gap-1 text-sm text-ink-faint">
          <Eye className="h-4 w-4" /> {designer.viewCount}
        </span>
      </div>

      {designer.selfIntroduction && (
        <section className="rounded-2xl border border-line p-4">
          <h2 className="mb-2 text-sm font-bold">자기소개</h2>
          <p className="whitespace-pre-line text-sm text-ink-soft">{designer.selfIntroduction}</p>
        </section>
      )}

      <section className="rounded-2xl border border-line p-4">
        <h2 className="mb-2 text-sm font-bold">직급</h2>
        <p className="text-sm text-ink-soft">{designer.jobTitle}</p>
      </section>

      {ownerName && (
        <section className="rounded-2xl border border-line p-4">
          <h2 className="mb-3 text-sm font-bold">내 명함</h2>
          <TopDesignerBusinessCardDownload
            name={ownerName}
            starTier={designer.starTier}
            regionLabel={designer.activeRegionLabel}
            careerYears={designer.careerYears}
            profilePhotoUrl={designer.profilePhotoUrl}
            seed={designer.id}
          />
        </section>
      )}
    </div>
  );
}
