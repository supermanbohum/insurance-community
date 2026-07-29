'use client';

import Link from 'next/link';
import {
  Building2,
  Briefcase,
  GraduationCap,
  HeartHandshake,
  Database,
  Wallet,
  Sparkles,
  ShieldCheck,
  Users,
  Car,
  UserCheck,
  Clock,
  ChevronRight,
  MessageSquareText,
  type LucideIcon,
} from 'lucide-react';
import type { BranchPreviewData } from '@/components/branch/types';
import { INCOME_TIER_BADGE, TIER_ORDER } from '@/lib/planners/tier';
import { BranchGallery } from '@/components/branch/BranchGallery';
import { BranchContactList } from '@/components/branch/BranchContactList';
import { BranchStickyActionBar } from '@/components/branch/BranchStickyActionBar';
import { BranchPillTags } from '@/components/branch/BranchPillTags';
import { BranchFavoriteButton } from '@/components/branch/BranchFavoriteButton';
import { BranchLocationMap } from '@/components/branch/BranchLocationMap';
import { ResponsiveSection } from '@/components/shared/ResponsiveSection';
import { getDefaultConfig, type Device, type SectionConfig } from '@/lib/design/sections';
import { cn } from '@/lib/utils';

const BLOCK_ICON: Record<string, LucideIcon> = {
  '회사소개': Building2,
  '교육 안내': GraduationCap,
  '복지 안내': HeartHandshake,
  'DB지원 안내': Database,
  '정착지원 안내': Wallet,
  '분위기': Sparkles,
};

const LINK_META: Record<string, { emoji: string; label: string }> = {
  instagram: { emoji: '📷', label: 'Instagram' },
  blog: { emoji: '📝', label: 'Blog' },
  youtube: { emoji: '▶', label: 'YouTube' },
  website: { emoji: '🌐', label: 'Website' },
  etc: { emoji: '🔗', label: '기타' },
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

/** 디자인 편집모드가 저장한 기기별 설정에서 특정 섹션 키만 뽑아 ResponsiveSection에 넘길
 * `{mobile, tablet, desktop}` 형태로 재구성한다. */
function sectionConfigFor(
  layoutConfig: Record<Device, SectionConfig[]>,
  key: string
): Record<Device, SectionConfig | undefined> {
  return {
    mobile: layoutConfig.mobile.find((s) => s.key === key),
    tablet: layoutConfig.tablet.find((s) => s.key === key),
    desktop: layoutConfig.desktop.find((s) => s.key === key),
  } as Record<Device, SectionConfig | undefined>;
}

/**
 * 지점(Branch) 상세의 단일 진실 공급원. 홈/검색/지도/즐겨찾기/관리자 미리보기 등
 * 모든 진입 경로가 동일하게 이 컴포넌트를 렌더링한다 - 데이터 출처(DB fetch vs 편집 폼
 * 상태)만 다르고 마크업/레이아웃은 완전히 동일하다. GA(회사)는 로고+이름만 브랜드
 * 미니블록으로 표시되며 별도 상세페이지로 이어지지 않는다(GA는 상위 브랜드 정보일 뿐).
 *
 * 각 섹션의 순서/노출/여백은 디자인 편집모드(0020 page_layouts)가 저장한 layoutConfig를
 * 따른다 - 저장된 값이 없으면 호출부가 넘기는 기본값(getDefaultConfig)이 지금 순서
 * 그대로를 재현한다.
 */
export function BranchDetailView({
  data,
  variant,
  favorite,
  layoutConfig,
}: {
  data: BranchPreviewData;
  variant: 'public' | 'preview';
  /** 공개 페이지에서만 넘겨준다 - 관리자 미리보기에는 "지금 보는 사람의 즐겨찾기"라는 개념이 없다. */
  favorite?: { branchId: string; initialFavorited: boolean };
  /** 디자인 편집모드에서 저장한 값 - 콘텐츠 미리보기(관리자 지점 편집 폼의 "미리보기" 탭)처럼
   * 레이아웃 자체는 관심사가 아닌 곳에서는 생략하면 기본값(지금 순서 그대로)으로 렌더링된다. */
  layoutConfig?: Record<Device, SectionConfig[]>;
}) {
  const layout =
    layoutConfig ??
    {
      mobile: getDefaultConfig('branch_detail'),
      tablet: getDefaultConfig('branch_detail'),
      desktop: getDefaultConfig('branch_detail'),
    };

  const introBlocks = [
    { label: '회사소개', value: data.introText },
    { label: '교육 안내', value: data.educationInfo },
    { label: '복지 안내', value: data.welfareInfo },
    { label: 'DB지원 안내', value: data.dbSupportInfo },
    { label: '정착지원 안내', value: data.settlementSupportInfo },
    { label: '분위기', value: data.atmosphereInfo },
  ].filter((block) => block.value?.trim());

  const facts = [
    data.plannerCount !== null && {
      icon: Users,
      label: '설계사 수',
      value: data.plannerCount >= 101 ? '100명 이상' : `${data.plannerCount}명 이하`,
    },
    data.parkingAvailable !== null && { icon: Car, label: '주차', value: data.parkingAvailable ? '가능' : '불가능' },
    data.visitConsultAvailable !== null && {
      icon: UserCheck,
      label: '방문 상담',
      value: data.visitConsultAvailable ? '가능' : '불가능',
    },
    data.newRecruitTraining && { icon: GraduationCap, label: '신입 교육', value: '가능' },
    data.experiencedHire && { icon: Briefcase, label: '경력 채용', value: '가능' },
    data.dbSupport && { icon: Database, label: 'DB 제공', value: '가능' },
    data.settlementSupport && { icon: Wallet, label: '정착지원금', value: '있음' },
    data.businessHours && { icon: Clock, label: '운영시간', value: data.businessHours },
  ].filter((f): f is { icon: LucideIcon; label: string; value: string } => Boolean(f));

  const section = (key: string) => sectionConfigFor(layout, key);

  return (
    <div className={cn('flex flex-col', variant === 'public' && 'pb-28 lg:pb-6')}>
      <header className="mb-5 flex items-start gap-3">
        {data.gaCompanyLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.gaCompanyLogoUrl}
            alt={data.gaCompanyName}
            className="h-11 w-11 shrink-0 rounded-xl object-cover shadow-card"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-extrabold text-brand-600">
            {data.gaCompanyName.slice(0, 2)}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h1 className="text-xl font-extrabold tracking-tight text-ink">{data.name}</h1>
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
            {data.activeRecruits.length > 0 && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">채용중</span>
            )}
          </div>
          <p className="truncate text-sm font-medium text-ink-soft">{data.gaCompanyName}</p>
          {data.managerName && <p className="text-xs text-ink-faint">대표 {data.managerName}</p>}
          <p className="text-sm text-ink-faint">
            {data.address}
            {data.addressDetail ? ` ${data.addressDetail}` : ''}
          </p>
        </div>
        {favorite && <BranchFavoriteButton branchId={favorite.branchId} initialFavorited={favorite.initialFavorited} />}
      </header>

      <ResponsiveSection sectionKey="gallery" config={section('gallery')}>
        <BranchGallery media={data.media} />
      </ResponsiveSection>

      {data.tagline && (
        <ResponsiveSection sectionKey="tagline" config={section('tagline')}>
          <p className="inline-flex w-fit items-center gap-1.5 self-start rounded-full bg-gradient-to-r from-brand-50 to-brand-100/60 px-3.5 py-2 text-[13px] font-bold text-brand-700 ring-1 ring-brand-200">
            ✨ {data.tagline}
          </p>
        </ResponsiveSection>
      )}

      {data.links.length > 0 && (
        <ResponsiveSection sectionKey="links" config={section('links')}>
          <div className="flex flex-wrap gap-2">
            {data.links.map((link) => {
              const meta = LINK_META[link.type] ?? LINK_META.etc;
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-brand-200 hover:text-brand-600"
                >
                  <span>{meta.emoji}</span>
                  {meta.label}
                </a>
              );
            })}
          </div>
        </ResponsiveSection>
      )}

      <ResponsiveSection sectionKey="pillTags" config={section('pillTags')}>
        <BranchPillTags
          isGaVerified={data.isGaVerified}
          sidoName={data.sidoName}
          sigunguName={data.sigunguName}
          gaBranchCount={data.gaBranchCount}
          updatedAt={data.updatedAt}
        />
      </ResponsiveSection>

      {data.plannerBadges.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <span className="text-sm font-extrabold text-amber-900">
            🏆 고소득 설계사 {data.plannerBadges.reduce((sum, b) => sum + b.count, 0)}명
          </span>
          <div className="flex flex-wrap gap-1.5">
            {TIER_ORDER.filter((tier) => data.plannerBadges.some((b) => b.tier === tier)).map((tier) => {
              const count = data.plannerBadges.find((b) => b.tier === tier)?.count ?? 0;
              return (
                <span key={tier} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-amber-800 shadow-sm">
                  {INCOME_TIER_BADGE[tier]} × {count}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <ResponsiveSection sectionKey="actionBar" config={section('actionBar')}>
        <BranchStickyActionBar
          name={data.name}
          address={data.address}
          lat={data.lat}
          lng={data.lng}
          contacts={data.contacts}
          variant={variant}
        />
      </ResponsiveSection>

      {data.lat != null && data.lng != null && (
        <ResponsiveSection sectionKey="map" config={section('map')}>
          <BranchLocationMap
            branchId={data.slug || data.name}
            branchSlug={data.slug}
            branchName={data.name}
            gaCompanyName={data.gaCompanyName}
            address={data.address}
            lat={data.lat}
            lng={data.lng}
          />
        </ResponsiveSection>
      )}

      {introBlocks.length > 0 && (
        <ResponsiveSection sectionKey="introBlocks" config={section('introBlocks')}>
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
        </ResponsiveSection>
      )}

      {facts.length > 0 && (
        <ResponsiveSection sectionKey="facts" config={section('facts')}>
          <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {facts.map((fact) => {
              const Icon = fact.icon;
              return (
                <div key={fact.label} className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-white py-3 text-center shadow-card">
                  <Icon className="h-4 w-4 text-brand-600" />
                  <span className="text-[13px] font-bold text-ink">{fact.value}</span>
                  <span className="text-[11px] text-ink-faint">{fact.label}</span>
                </div>
              );
            })}
          </section>
        </ResponsiveSection>
      )}

      {data.insurerNames.length > 0 && (
        <ResponsiveSection sectionKey="insurers" config={section('insurers')}>
          <Section title="취급 원수사" icon={ShieldCheck}>
            <div className="flex flex-wrap gap-1.5">
              {data.insurerNames.map((name) => (
                <span
                  key={name}
                  className="rounded-xl border border-line bg-surface-sunken px-2.5 py-1.5 text-xs font-semibold text-ink-soft"
                >
                  {name}
                </span>
              ))}
            </div>
          </Section>
        </ResponsiveSection>
      )}

      {data.activeRecruits.length > 0 && (
        <ResponsiveSection sectionKey="recruit" config={section('recruit')}>
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
                  <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">{recruit.content}</p>
                </div>
              ))}
            </div>
          </Section>
        </ResponsiveSection>
      )}

      <ResponsiveSection sectionKey="reviews" config={section('reviews')}>
        <Section title="이용후기" icon={MessageSquareText}>
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line py-8 text-center">
            <p className="text-[13px] text-ink-faint">아직 등록된 후기가 없습니다.</p>
            <Link
              href={variant === 'preview' ? '#' : '/board/review'}
              onClick={variant === 'preview' ? (e) => e.preventDefault() : undefined}
              className="rounded-full bg-brand-50 px-3.5 py-1.5 text-xs font-bold text-brand-600 transition-colors hover:bg-brand-100"
            >
              이용후기 게시판에서 후기 남기기
            </Link>
          </div>
        </Section>
      </ResponsiveSection>

      <ResponsiveSection sectionKey="contacts" config={section('contacts')}>
        <Section title="연락처">
          <BranchContactList contacts={data.contacts} variant={variant} />
        </Section>
      </ResponsiveSection>

      {data.siblingBranches.length > 0 && (
        <ResponsiveSection sectionKey="siblings" config={section('siblings')}>
          <Section title={`${data.gaCompanyName}의 다른 지점 (${data.siblingBranches.length})`}>
            <div className="flex flex-col divide-y divide-line">
              {data.siblingBranches.map((sibling) => (
                <Link
                  key={sibling.id}
                  href={variant === 'preview' ? '#' : `/branch/${sibling.slug}`}
                  onClick={variant === 'preview' ? (e) => e.preventDefault() : undefined}
                  className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="truncate text-sm font-bold text-ink">{sibling.name}</p>
                    <p className="truncate text-xs text-ink-faint">
                      {[sibling.sidoName, sibling.sigunguName].filter(Boolean).join(' ')}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" />
                </Link>
              ))}
            </div>
          </Section>
        </ResponsiveSection>
      )}
    </div>
  );
}
