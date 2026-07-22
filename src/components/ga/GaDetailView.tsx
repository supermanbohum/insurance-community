'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  BadgeCheck,
  Building2,
  GraduationCap,
  HeartHandshake,
  Sparkles,
  MapPin,
  ChevronRight,
  Video,
  type LucideIcon,
} from 'lucide-react';
import type { GaPreviewData } from '@/components/ga/types';
import { GaGallery } from '@/components/ga/GaGallery';
import { GaStickyActionBar } from '@/components/ga/GaStickyActionBar';
import { GaSnsLinks } from '@/components/ga/GaSnsLinks';
import { GaLocationMap } from '@/components/ga/GaLocationMap';
import { cn } from '@/lib/utils';

const BLOCK_ICON: Record<string, LucideIcon> = {
  '회사소개': Building2,
  '교육 소개': GraduationCap,
  '복지 소개': HeartHandshake,
  '회사 강점': Sparkles,
};

function Section({ title, icon: Icon, children }: { title: string; icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
      <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold tracking-tight text-ink">
        {Icon && (
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        {title}
      </h2>
      {children}
    </section>
  );
}

function youtubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

/**
 * GA(본사) 상세의 단일 진실 공급원. 공개 페이지(/ga/[slug])와 관리자 실시간
 * 미리보기가 동일하게 이 컴포넌트를 렌더링한다 - "회사 홈페이지처럼" 배너/로고/소개/
 * 갤러리/지도/길찾기·전화·홈페이지/SNS/채용정보를 한 화면에 구성한다.
 */
export function GaDetailView({ data, variant }: { data: GaPreviewData; variant: 'public' | 'preview' }) {
  const introBlocks = [
    { label: '회사소개', value: data.description },
    { label: '교육 소개', value: data.educationInfo },
    { label: '복지 소개', value: data.welfareInfo },
    { label: '회사 강점', value: data.strengthsInfo },
  ].filter((block) => block.value?.trim());

  const embedUrl = data.promoVideoUrl ? youtubeEmbedUrl(data.promoVideoUrl) : null;

  return (
    <div className={cn('flex flex-col gap-5', variant === 'public' && 'pb-28 lg:pb-6')}>
      <GaGallery banner={data.banner} gallery={data.gallery} />

      <header className="flex items-start gap-3">
        {data.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.logoUrl} alt={data.name} className="h-14 w-14 shrink-0 rounded-xl object-cover shadow-card" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-lg font-extrabold text-brand-600">
            {data.name.slice(0, 2)}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h1 className="text-xl font-extrabold tracking-tight text-ink">{data.name}</h1>
            {data.isVerified && <BadgeCheck className="h-5 w-5 text-brand-500" />}
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                data.operationType === 'direct' ? 'bg-gold-50 text-gold-600' : 'bg-surface-sunken text-ink-soft'
              )}
            >
              {data.operationType === 'direct' ? '직영' : '지사'}
            </span>
            {data.isHeadquarters && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600">본사</span>
            )}
            {data.isRecruiting && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">채용중</span>
            )}
          </div>
          {data.ceoName && <p className="text-sm font-medium text-ink-soft">대표 {data.ceoName}</p>}
          {data.address && (
            <p className="flex items-center gap-1 text-sm text-ink-faint">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {data.address}
                {data.addressDetail ? ` ${data.addressDetail}` : ''}
              </span>
            </p>
          )}
          <p className="text-xs text-ink-faint">
            전국 {data.branchCount}개 지점 · {formatDistanceToNow(new Date(data.updatedAt), { addSuffix: true, locale: ko })} 업데이트
          </p>
        </div>
      </header>

      <GaStickyActionBar
        name={data.name}
        address={data.address}
        lat={data.lat}
        lng={data.lng}
        phone={data.phone}
        homepageUrl={data.homepageUrl}
        variant={variant}
      />

      <GaSnsLinks
        blogUrl={data.snsBlogUrl}
        instagramUrl={data.snsInstagramUrl}
        youtubeUrl={data.snsYoutubeUrl}
        kakaoChannelUrl={data.snsKakaoChannelUrl}
        openChatUrl={data.snsOpenChatUrl}
      />

      {(data.lat != null || embedUrl) && (
        <div className="flex flex-col gap-3">
          {data.lat != null && data.lng != null && (
            <GaLocationMap gaId={data.slug || data.name} gaName={data.name} address={data.address} lat={data.lat} lng={data.lng} />
          )}
          {embedUrl && (
            <Section title="홍보영상" icon={Video}>
              <div className="aspect-video w-full overflow-hidden rounded-xl">
                <iframe
                  src={embedUrl}
                  title="홍보영상"
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </Section>
          )}
        </div>
      )}

      {introBlocks.length > 0 && (
        <section className="flex flex-col gap-3">
          {introBlocks.map((block) => {
            const Icon = BLOCK_ICON[block.label];
            return (
              <Section key={block.label} title={block.label} icon={Icon}>
                <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">{block.value}</p>
              </Section>
            );
          })}
        </section>
      )}

      {data.activeRecruits.length > 0 && (
        <Section title="채용">
          <div className="flex flex-col gap-2.5">
            {data.activeRecruits.map((recruit) => (
              <div key={recruit.id} className="rounded-xl border border-brand-100 bg-brand-50/50 p-3.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-bold text-ink">{recruit.title}</p>
                  {recruit.employmentType && (
                    <span className="rounded-full border border-brand-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-brand-600">
                      {recruit.employmentType}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-ink-faint">{recruit.branchName}</p>
                <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">{recruit.content}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {data.branches.length > 0 && (
        <Section title={`전국 지점 (${data.branches.length})`}>
          <div className="flex flex-col divide-y divide-line">
            {data.branches.map((branch) => (
              <Link
                key={branch.id}
                href={variant === 'preview' ? '#' : `/branch/${branch.id}`}
                onClick={variant === 'preview' ? (e) => e.preventDefault() : undefined}
                className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-sm font-bold text-ink">{branch.name}</p>
                  <p className="truncate text-xs text-ink-faint">
                    {[branch.sidoName, branch.sigunguName].filter(Boolean).join(' ') || branch.address}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" />
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
