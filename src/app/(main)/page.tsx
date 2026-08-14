import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, MapPin } from 'lucide-react';
import { listPublicBranches, getHomeStats } from '@/lib/public/branch';
import { listActiveBanners } from '@/lib/public/banners';
import { getPageLayoutConfig } from '@/lib/design/layout';
import { getActiveHomeOpenBanner } from '@/lib/admin/home-banner';
import { listTopDesignerHomeRanking, listGaQualityRanking } from '@/lib/public/top-designer.supabase';
import { HOME_SECTIONS, type Device } from '@/lib/design/sections';
import { ResponsiveSection } from '@/components/shared/ResponsiveSection';
import { HomeOpenBanner } from '@/components/home/HomeOpenBanner';
import { HomeAdSlot } from '@/components/home/HomeAdSlot';
import { HomeRegisterCta, HomeRegisterStats } from '@/components/home/HomeRegisterHero';
import { getMyBranchSlotState } from '@/lib/public/my-branch-slot';
import { QuickMenuGrid } from '@/components/home/QuickMenuGrid';
import { InfiniteCarousel } from '@/components/home/carousel/InfiniteCarousel';
import { GaQualityCard } from '@/components/home/carousel/GaQualityCard';
import { NewBranchCard } from '@/components/home/carousel/NewBranchCard';
import { TopDesignerHomeRanking } from '@/components/home/TopDesignerHomeRanking';
import { JsonLd } from '@/components/seo/JsonLd';
import { websiteJsonLd, organizationJsonLd } from '@/lib/seo/jsonld';
import { DEFAULT_META_DESCRIPTION, DEFAULT_KEYWORDS } from '@/lib/seo/config';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: { absolute: '보험맵 | 전국 GA·보험대리점 정보와 보험설계사 리크루팅' },
  description: DEFAULT_META_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  alternates: { canonical: '/' },
};

// (main)/layout.tsx가 매 요청마다 getCurrentUser()로 로그인 쿠키를 읽기 때문에
// (헤더에 로그인 상태를 정확히 보여주려면 필요) 이 레이아웃 아래 페이지는 전부
// 어차피 dynamic 렌더링된다 - 여기서 revalidate를 걸어도 실제로는 적용되지 않는다.
// 그래도 데이터 조회 함수(listPublicBranches/listSidoGroups)는 cookies()를 안 쓰는
// 공개 클라이언트로 옮겨뒀다 - 추후 헤더의 로그인 체크를 클라이언트 사이드로 옮기면
// 그때는 이 페이지가 바로 캐시 가능해진다.
export const dynamic = 'force-dynamic';

function Section({
  title,
  subtitle,
  moreHref,
  moreLabel = '더보기',
  moreVariant = 'default',
  secondary,
  children,
}: {
  title: string;
  subtitle?: string;
  moreHref: string;
  moreLabel?: string;
  /** 섹션 헤더의 보조 칩(현재 우수GA의 [우리 동네 보기] 하나뿐) - 별도 대형 섹션을
   * 만들지 않고 기존 섹션에서 같은 목록의 필터로 들어가게 한다(CTO 확정). */
  secondary?: { href: string; label: string };
  /** 'gold' = TOP 인증류 CTA(디자인 SPEC-036 §2) - 인증 언어를 다른 섹션의 파랑
   * CTA와 시각적으로 분리해 "이건 증명이 필요한 다른 종류의 행동"임을 알린다. */
  moreVariant?: 'default' | 'gold';
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      {/* SPEC-036(디자인, 2026-08-10) - 부제를 제목+CTA 행과 완전히 분리된 전폭 2번째
          행으로 뺐다. 부제가 몇 줄이 되든 아래로만 자라 CTA와 절대 같은 공간을 다투지
          않는다(이전 P0 - min-w-0/shrink-0 패치는 같은 행 안에서 줄바꿈만 시켰는데,
          디자인은 애초에 행을 분리하는 쪽을 최종 구조로 확정했다). */}
      <div className="flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="whitespace-nowrap text-[17px] font-extrabold tracking-tight text-ink">{title}</h2>
          <span className="flex shrink-0 items-center gap-1.5">
            {secondary && (
              <Link
                href={secondary.href}
                // 색 규칙(CTO 확정): 골드는 인증 언어(TOP 인증) 전용, 그 외 탐색 액션은
                // 전부 블루다. 회색은 이 체계 밖이라 쓰지 않는다.
                className="flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-brand-600 px-3 text-[13px] font-bold text-brand-600 transition-colors hover:bg-[#F0F6FF]"
              >
                <MapPin className="h-3.5 w-3.5" />
                {secondary.label}
              </Link>
            )}
          <Link
            href={moreHref}
            className={cn(
              'flex h-8 shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-bold transition-colors',
              moreVariant === 'gold'
                ? 'border-[#c48a0f] text-[#c48a0f] hover:bg-[#fdf6e8]'
                : 'border-brand-600 text-brand-600 hover:bg-[#F0F6FF]'
            )}
          >
            {moreLabel}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          </span>
        </div>
        {subtitle && (
          <p className="mt-1.5 w-full text-[13px] font-medium leading-[1.55] text-ink-faint [word-break:keep-all]">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const [gaQuality, latest, stats, layoutConfig, openBanner, topDesignerRanking, adBanners, myBranchSlot] =
    await Promise.all([
    // "인기 GA"(조회수) → "우수 GA"(TOP 설계사 등급 합산 점수)로 대체(오너 지시 ⑤).
    listGaQualityRanking(10),
    listPublicBranches({ sort: 'newest', limit: 10 }),
    getHomeStats(),
    getPageLayoutConfig('home'),
    getActiveHomeOpenBanner(),
    // 콘텐츠팀 임계 원칙(N>10에서만 순위 강조) 판별용으로 1건 더 받아온다 - 실제
    // 렌더링은 컴포넌트 안에서 10건까지만 자른다.
    listTopDesignerHomeRanking(11),
    // SPEC-040 광고 지면. public_banners 뷰가 is_active·게재기간을 이미 걸러주므로
    // 여기서는 슬롯만 좁힌다. 🔴 슬롯 값 'mobile_list_middle'은 0001의 레거시
    // 이름이다 - 지면은 PC/모바일 구분 없이 같은 자리에 뜬다. enum 값을 늘리는
    // 마이그레이션 대신 이름을 그대로 쓰고, 관리자 화면 라벨을 실제 위치로 고쳤다.
    listActiveBanners('mobile_list_middle'),
    // SPEC-042 - 뷰어별 「우리 지점」 상태. 🔴 이 조회는 쿠키를 읽는다.
    // 이 페이지는 이미 force-dynamic이라(레이아웃이 매 요청 getCurrentUser를 부른다)
    // 추가 비용은 없지만, 위 주석의 "추후 캐시 가능해진다"는 길은 이것이 들어오면서
    // 막혔다 - 그때는 이 슬롯도 함께 클라이언트로 옮겨야 한다.
    getMyBranchSlotState(),
  ]);

  // priority 내림차순 정렬된 목록의 첫 건만 쓴다 - 지면이 하나라 회전은 없다.
  const adBanner = adBanners[0] ?? null;

  // 옛 키 'hero'로 저장된 문구는 layout.supabase.ts의 legacy 매핑이 heroCta로 넘겨준다.
  const ctaLabel = layoutConfig.desktop.find((s) => s.key === 'heroCta')?.text?.ctaLabel ?? '우리 지점 등록하기';

  const nodesByKey: Record<(typeof HOME_SECTIONS)[number]['key'], React.ReactNode> = {
    // 🔴 hero 하나가 CTA+통계를 덮던 것을 분리(CTO 지시 2026-08-14) - 이제 편집기에서
    // 둘을 따로 숨기고 따로 옮길 수 있다.
    heroCta: <HomeRegisterCta ctaLabel={ctaLabel} />,
    heroStats: <HomeRegisterStats stats={stats} myBranchSlot={myBranchSlot} />,
    quickMenu: <QuickMenuGrid />,
    // 🔴 소재가 없으면 null - 빈 지면을 그리지 않는다(SPEC-004 §3, pc_left 폐지 사유).
    adSlot: adBanner ? <HomeAdSlot banner={adBanner} /> : null,
    popularGa: (
      <Section
        title="🏅 우수 GA"
        // 콘텐츠팀 확정 문안(2026-08-10) - "TOP 인증 등급만 합산" 문구가 0088(미제출자
        // 1점 티어 포함)로 부정확해진 것을 반영.
        subtitle="TOP 인증 등급을 중심으로, 등록된 설계사 수까지 합산한 점수 순위입니다"
        // "더보기"는 전체 목록 페이지(/ga-ranking, 0089와 함께 신설)로 보낸다 - 예전엔
        // /top-designer(TOP 설계사 개인 목록)로 갔는데 GA 단위 랭킹과 기준이 달라
        // 어긋나 있었다. 아직 승인된 TOP 인증이 없으면(부분 버전) 빈 상태 CTA는 TOP
        // 설계사 인증 신청으로 보낸다(등록 CTA가 아니라 인증 CTA).
        moreHref={gaQuality.length === 0 ? '/top-designer-register' : '/ga-ranking'}
        moreLabel={gaQuality.length === 0 ? 'TOP 인증 신청' : '더보기'}
        moreVariant={gaQuality.length === 0 ? 'gold' : 'default'}
        // ⑨ 진입점 - 홈에는 이 칩 하나만 둔다. 전 지역 0건인 지금 대형 섹션을 신설하면
        // 빈 화면 면적만 늘어난다(CTO 확정).
        secondary={{ href: '/ga-ranking', label: '우리 동네 보기' }}
      >
        {gaQuality.length === 0 ? (
          <EmptyRow text="첫 점수를 만드는 GA가 1위로 시작합니다." />
        ) : (
          <InfiniteCarousel
            durationSec={28}
            itemClassName="w-[190px] sm:w-[210px]"
            items={gaQuality.map((ga, i) => ({ key: ga.gaCompanyId, node: <GaQualityCard ga={ga} rank={i + 1} /> }))}
          />
        )}
      </Section>
    ),
    latest: (
      <Section
        title="🆕 신규 등록"
        subtitle="최근에 새로 올라온 지점"
        moreHref={latest.length === 0 ? '/register' : '/search?sort=newest'}
        moreLabel={latest.length === 0 ? '우리 지점 등록하기' : '더보기'}
      >
        {latest.length === 0 ? (
          <EmptyRow text="신규 등록된 지점이 없습니다." />
        ) : (
          <InfiniteCarousel
            durationSec={38}
            itemClassName="w-[190px] sm:w-[210px]"
            items={latest.map((b) => ({ key: b.id, node: <NewBranchCard branch={b} /> }))}
          />
        )}
      </Section>
    ),
    topDesignerRanking: (
      <Section title="🏆 TOP 설계사 랭킹" subtitle="연봉 기준 실시간 랭킹" moreHref="/top-designer">
        <TopDesignerHomeRanking rows={topDesignerRanking} />
      </Section>
    ),
  };

  const devices: Device[] = ['mobile', 'tablet', 'desktop'];

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 pb-6 pt-4">
      {/* 화면에는 카드/CTA 위주 디자인이라 보이는 제목이 없다 - 검색엔진이 페이지
          주제를 정확히 파악하도록 시각적으로만 숨긴 h1을 둔다. */}
      <h1 className="sr-only">보험맵 - 전국 GA·보험대리점 정보와 보험설계사 리크루팅 플랫폼</h1>
      <JsonLd data={[websiteJsonLd(), organizationJsonLd()]} />
      {openBanner && (
        <div className="mb-3">
          <HomeOpenBanner banner={openBanner} />
        </div>
      )}
      {/* 🔴 노드가 null인 섹션은 래퍼째 건너뛴다. ResponsiveSection은 children이
          비어도 margin-bottom(기본 28px)을 가진 div를 그리므로, 광고 소재가 없을 때
          홈에 28px짜리 빈 틈이 생긴다 - 빈 지면을 안 그리기로 한 결정이 무의미해진다. */}
      {HOME_SECTIONS.filter((def) => nodesByKey[def.key] !== null).map((def) => (
        <ResponsiveSection
          key={def.key}
          sectionKey={def.key}
          config={Object.fromEntries(
            devices.map((device) => [device, layoutConfig[device].find((s) => s.key === def.key)])
          ) as Record<Device, (typeof layoutConfig.mobile)[number] | undefined>}
        >
          {nodesByKey[def.key]}
        </ResponsiveSection>
      ))}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line py-10 text-ink-faint">
      <p className="text-sm">{text}</p>
    </div>
  );
}
