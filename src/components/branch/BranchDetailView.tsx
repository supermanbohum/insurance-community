'use client';

import {
  BadgeCheck,
  Building2,
  GraduationCap,
  HeartHandshake,
  Database,
  Wallet,
  ShieldCheck,
  Users,
  Car,
  UserCheck,
  Clock,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import type { BranchPreviewData } from '@/components/branch/types';
import { BranchGallery } from '@/components/branch/BranchGallery';
import { BranchContactList } from '@/components/branch/BranchContactList';
import { BranchStickyActionBar } from '@/components/branch/BranchStickyActionBar';
import { cn } from '@/lib/utils';

const BLOCK_ICON: Record<string, LucideIcon> = {
  '회사소개': Building2,
  '교육 안내': GraduationCap,
  '복지 안내': HeartHandshake,
  'DB지원 안내': Database,
  '정착지원 안내': Wallet,
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

/**
 * 지점 상세의 단일 진실 공급원. 공개 페이지(/branch/[branchId])와 관리자 실시간
 * 미리보기가 동일하게 이 컴포넌트를 렌더링한다 - 데이터 출처(DB fetch vs 편집 폼
 * 상태)만 다르고 마크업/레이아웃은 완전히 동일하다.
 */
export function BranchDetailView({ data, variant }: { data: BranchPreviewData; variant: 'public' | 'preview' }) {
  const introBlocks = [
    { label: '회사소개', value: data.introText },
    { label: '교육 안내', value: data.educationInfo },
    { label: '복지 안내', value: data.welfareInfo },
    { label: 'DB지원 안내', value: data.dbSupportInfo },
    { label: '정착지원 안내', value: data.settlementSupportInfo },
  ].filter((block) => block.value?.trim());

  const facts = [
    data.plannerCount !== null && { icon: Users, label: '설계사 수', value: `${data.plannerCount}명` },
    data.parkingAvailable !== null && { icon: Car, label: '주차', value: data.parkingAvailable ? '가능' : '불가능' },
    data.visitConsultAvailable !== null && {
      icon: UserCheck,
      label: '방문 상담',
      value: data.visitConsultAvailable ? '가능' : '불가능',
    },
    data.businessHours && { icon: Clock, label: '운영시간', value: data.businessHours },
  ].filter((f): f is { icon: LucideIcon; label: string; value: string } => Boolean(f));

  return (
    <div className={cn('flex flex-col gap-5', variant === 'public' && 'pb-28 lg:pb-6')}>
      <header className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <h1 className="text-xl font-extrabold tracking-tight text-ink">{data.name}</h1>
          {data.isGaVerified && (
            <span className="flex items-center gap-0.5 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
              <BadgeCheck className="h-3.5 w-3.5" />
              공식 인증 GA
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-ink-soft">{data.gaCompanyName}</p>
        <p className="text-sm text-ink-faint">
          {data.address}
          {data.addressDetail ? ` ${data.addressDetail}` : ''}
        </p>
        <p className="flex items-center gap-1 text-xs text-ink-faint">
          <RefreshCw className="h-3 w-3" />
          최근 업데이트 {new Date(data.updatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
        </p>
      </header>

      <BranchGallery media={data.media} />

      <BranchStickyActionBar
        name={data.name}
        address={data.address}
        lat={data.lat}
        lng={data.lng}
        contacts={data.contacts}
        variant={variant}
      />

      {facts.length > 0 && (
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

      {data.insurerNames.length > 0 && (
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
                <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">{recruit.content}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="연락처">
        <BranchContactList contacts={data.contacts} variant={variant} />
      </Section>
    </div>
  );
}
