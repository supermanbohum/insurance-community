'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { INCOME_TIER_OPTIONS } from '@/lib/planners/tier';
import type { PlannerIncomeTier } from '@/types/database';

const PLANNER_TIERS = [
  { value: 0, label: '전체' },
  { value: 30, label: '30명 이상' },
  { value: 50, label: '50명 이상' },
  { value: 100, label: '100명 이상' },
  { value: 300, label: '300명 이상' },
];

const PARKING_OPTIONS: { value: '' | 'true' | 'false'; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'true', label: '주차 가능' },
  { value: 'false', label: '주차 불가' },
];

const STRUCTURE_OPTIONS: { value: '' | 'direct' | 'branch'; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'direct', label: '직영' },
  { value: 'branch', label: '지사' },
];

export interface SearchFilterCurrent {
  query: string;
  sort: string;
  region: string;
  /** 시/군/구 region_id - B2(2단 드릴다운). region 없이는 의미 없다. 지도(map) 등
   * 아직 드릴다운을 배선하지 않은 화면은 이 필드를 생략할 수 있다. */
  sigungu?: string;
  gaIds: string[];
  minPlanners: number;
  parking: '' | 'true' | 'false';
  structure: '' | 'direct' | 'branch';
  hasHighIncomePlanners: boolean;
  plannerTiers: PlannerIncomeTier[];
}

export function SearchFilterButton({
  current,
  regionOptions,
  sigunguOptions = [],
  gaOptions,
  basePath = '/search',
}: {
  current: SearchFilterCurrent;
  regionOptions: { sidoCode: string; sidoName: string }[];
  sigunguOptions?: { regionId: string; sidoCode: string; sigunguName: string }[];
  gaOptions: { id: string; name: string }[];
  basePath?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draftRegion, setDraftRegion] = useState(current.region);
  const [draftSigungu, setDraftSigungu] = useState(current.sigungu ?? '');
  const [draftGaIds, setDraftGaIds] = useState<string[]>(current.gaIds);
  const [draftMinPlanners, setDraftMinPlanners] = useState(current.minPlanners);
  const [draftParking, setDraftParking] = useState<'' | 'true' | 'false'>(current.parking);
  const [draftStructure, setDraftStructure] = useState<'' | 'direct' | 'branch'>(current.structure);
  const [draftHasHighIncomePlanners, setDraftHasHighIncomePlanners] = useState(current.hasHighIncomePlanners);
  const [draftPlannerTiers, setDraftPlannerTiers] = useState<PlannerIncomeTier[]>(current.plannerTiers);

  useEffect(() => {
    if (open) {
      setDraftRegion(current.region);
      setDraftSigungu(current.sigungu ?? '');
      setDraftGaIds(current.gaIds);
      setDraftMinPlanners(current.minPlanners);
      setDraftParking(current.parking);
      setDraftStructure(current.structure);
      setDraftHasHighIncomePlanners(current.hasHighIncomePlanners);
      setDraftPlannerTiers(current.plannerTiers);
    }
  }, [
    open,
    current.region,
    current.gaIds,
    current.minPlanners,
    current.parking,
    current.structure,
    current.hasHighIncomePlanners,
    current.plannerTiers,
    current.sigungu,
  ]);

  const activeCount =
    (current.region ? 1 : 0) +
    current.gaIds.length +
    (current.minPlanners > 0 ? 1 : 0) +
    (current.parking ? 1 : 0) +
    (current.structure ? 1 : 0) +
    (current.hasHighIncomePlanners ? 1 : 0);

  function togglePlannerTier(tier: PlannerIncomeTier) {
    setDraftPlannerTiers((prev) => (prev.includes(tier) ? prev.filter((v) => v !== tier) : [...prev, tier]));
  }

  function toggleGa(id: string) {
    setDraftGaIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function apply() {
    const params = new URLSearchParams();
    if (current.query) params.set('q', current.query);
    if (current.sort !== 'recommended') params.set('sort', current.sort);
    if (draftRegion) params.set('region', draftRegion);
    if (draftRegion && draftSigungu) params.set('sigungu', draftSigungu);
    if (draftGaIds.length > 0) params.set('ga', draftGaIds.join(','));
    if (draftMinPlanners > 0) params.set('minPlanners', String(draftMinPlanners));
    if (draftParking) params.set('parking', draftParking);
    if (draftStructure) params.set('structure', draftStructure);
    if (draftHasHighIncomePlanners) {
      params.set('highIncome', '1');
      if (draftPlannerTiers.length > 0) params.set('tiers', draftPlannerTiers.join(','));
    }
    router.push(`${basePath}?${params.toString()}`);
    setOpen(false);
  }

  function reset() {
    setDraftRegion('');
    setDraftSigungu('');
    setDraftGaIds([]);
    setDraftMinPlanners(0);
    setDraftParking('');
    setDraftStructure('');
    setDraftHasHighIncomePlanners(false);
    setDraftPlannerTiers([]);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="필터 열기"
        className={cn(
          'relative flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors',
          activeCount > 0
            ? 'border-brand-300 bg-brand-50 text-brand-700'
            : 'border-line bg-white text-ink-soft hover:bg-surface-sunken'
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span className="hidden sm:inline">필터</span>
        {activeCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
            <button
              type="button"
              aria-label="필터 닫기"
              className="absolute inset-0 animate-fade-in bg-ink/40"
              onClick={() => setOpen(false)}
            />
            <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] animate-fade-in flex-col rounded-t-3xl bg-white shadow-2xl sm:inset-y-0 sm:bottom-0 sm:left-auto sm:right-0 sm:h-full sm:max-h-none sm:w-[400px] sm:rounded-l-3xl sm:rounded-t-none">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <h2 className="text-base font-extrabold text-ink">필터</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="닫기"
                  className="rounded-full p-1.5 text-ink-faint transition-colors hover:bg-surface-sunken"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-4">
                <section className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-ink">GA</h3>
                    {/* 오너 지시(2026-08-14): GA 선택에서 전체 선택 가능해야 한다.
                        전부 선택된 상태에서 누르면 전체 해제로 토글된다. */}
                    <button
                      type="button"
                      onClick={() =>
                        setDraftGaIds(
                          draftGaIds.length === gaOptions.length ? [] : gaOptions.map((ga) => ga.id)
                        )
                      }
                      className="rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition-colors hover:border-brand-200 hover:text-brand-600"
                    >
                      {draftGaIds.length === gaOptions.length ? '전체 해제' : '전체 선택'}
                    </button>
                  </div>
                  <div className="flex max-h-52 flex-col gap-0.5 overflow-y-auto rounded-xl border border-line p-2">
                    {gaOptions.map((ga) => (
                      <label
                        key={ga.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink-soft hover:bg-surface-sunken"
                      >
                        <input
                          type="checkbox"
                          checked={draftGaIds.includes(ga.id)}
                          onChange={() => toggleGa(ga.id)}
                          className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-300"
                        />
                        {ga.name}
                      </label>
                    ))}
                  </div>
                </section>

                <section className="flex flex-col gap-2.5">
                  <h3 className="text-sm font-bold text-ink">GA 구조</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {STRUCTURE_OPTIONS.map((s) => (
                      <FilterPill key={s.value} active={draftStructure === s.value} onClick={() => setDraftStructure(s.value)}>
                        {s.label}
                      </FilterPill>
                    ))}
                  </div>
                </section>

                <section className="flex flex-col gap-2.5">
                  <h3 className="text-sm font-bold text-ink">지역</h3>
                  <div className="grid grid-cols-4 gap-1.5">
                    <FilterPill
                      active={draftRegion === ''}
                      onClick={() => {
                        setDraftRegion('');
                        setDraftSigungu('');
                      }}
                    >
                      전체
                    </FilterPill>
                    {regionOptions.map((r) => (
                      <FilterPill
                        key={r.sidoCode}
                        active={draftRegion === r.sidoCode}
                        onClick={() => {
                          // 시/도를 바꾸면 이전 시/도의 시/군/구 선택은 의미가 없어진다 -
                          // 매번 새로 드릴다운하게 한다(B2, SPEC-031 §2.5).
                          setDraftRegion(r.sidoCode);
                          setDraftSigungu('');
                        }}
                      >
                        {r.sidoName.replace(/(특별자치시|특별자치도|광역시|특별시|도)$/, '')}
                      </FilterPill>
                    ))}
                  </div>
                  {draftRegion && (
                    <div className="flex flex-wrap gap-1.5 rounded-xl bg-surface-sunken p-2">
                      <FilterPill active={draftSigungu === ''} onClick={() => setDraftSigungu('')}>
                        전체
                      </FilterPill>
                      {sigunguOptions
                        .filter((s) => s.sidoCode === draftRegion)
                        .map((s) => (
                          <FilterPill key={s.regionId} active={draftSigungu === s.regionId} onClick={() => setDraftSigungu(s.regionId)}>
                            {s.sigunguName}
                          </FilterPill>
                        ))}
                    </div>
                  )}
                </section>

                <section className="flex flex-col gap-2.5">
                  <h3 className="text-sm font-bold text-ink">인원수</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {PLANNER_TIERS.map((t) => (
                      <FilterPill key={t.value} active={draftMinPlanners === t.value} onClick={() => setDraftMinPlanners(t.value)}>
                        {t.label}
                      </FilterPill>
                    ))}
                  </div>
                </section>

                <section className="flex flex-col gap-2.5">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm font-bold text-ink">
                    <input
                      type="checkbox"
                      checked={draftHasHighIncomePlanners}
                      onChange={(e) => {
                        setDraftHasHighIncomePlanners(e.target.checked);
                        if (!e.target.checked) setDraftPlannerTiers([]);
                      }}
                      className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-300"
                    />
                    🏆 고소득 설계사 보기
                  </label>
                  {draftHasHighIncomePlanners && (
                    <div className="ml-6 flex flex-col gap-1.5">
                      {INCOME_TIER_OPTIONS.map((opt) => (
                        <label key={opt.value} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
                          <input
                            type="checkbox"
                            checked={draftPlannerTiers.includes(opt.value)}
                            onChange={() => togglePlannerTier(opt.value)}
                            className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-300"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  )}
                </section>

                <section className="flex flex-col gap-2.5">
                  <h3 className="text-sm font-bold text-ink">주차</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {PARKING_OPTIONS.map((p) => (
                      <FilterPill key={p.value} active={draftParking === p.value} onClick={() => setDraftParking(p.value)}>
                        {p.label}
                      </FilterPill>
                    ))}
                  </div>
                </section>
              </div>

              <div className="flex items-center gap-2 border-t border-line px-5 py-4">
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-sunken"
                >
                  초기화
                </button>
                <button
                  type="button"
                  onClick={apply}
                  className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
                >
                  적용하기
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition-colors',
        active ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white text-ink-soft hover:border-brand-200'
      )}
    >
      {children}
    </button>
  );
}
