import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, Eye, Megaphone, MapPinned } from 'lucide-react';
import { getPublicBranchDetail } from '@/lib/public/branch';
import { HeroCtaButton } from '@/components/home/HeroCtaButton';
import { SITE_CONFIG } from '@/lib/config/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '우리 지점 무료 등록 — 6개월 무료, 선착순 100개',
  description: '보험맵에 지점을 등록하면 지점 상세 페이지, 조회수, 채용공고까지 한 번에 노출됩니다. 지금 신청하면 6개월 무료(선착순 100개).',
  alternates: { canonical: '/register' },
};

// W-059(비로그인 문의 폼)가 배포되기 전까지는 "문의 수신" 혜택을 넣지 않는다 - 아직
// 없는 기능을 약속하면 등록한 지점장이 문의를 기다리다 아무것도 못 받는 첫인상을
// 남긴다(CTO 검수 지적). W-059가 나가면 이 배열에 다시 추가한다.
const BENEFITS = [
  { icon: MapPinned, label: '전용 지점 상세 페이지', desc: '지도·연락처·채용정보가 담긴 소개 페이지가 생깁니다' },
  { icon: Eye, label: '조회수 집계', desc: '설계사님들이 지점을 얼마나 찾아봤는지 그대로 보여드립니다' },
  { icon: Megaphone, label: '채용공고 등록', desc: '지점 페이지에 채용공고를 무료로 올릴 수 있습니다' },
];

/**
 * W-061① — "우리 지점 등록하기"의 새 목적지. 기존에는 이 버튼이 곧장 로그인 벽
 * (/partner/register → requireFullMember)으로 갔는데, 인스타 등 광고에서 폰으로
 * 넘어온 방문자가 아무 설명도 못 보고 로그인부터 요구받아 이탈했다(가입 완료 0건).
 * 이 페이지는 (main) 레이아웃 밖에 둬서 헤더/푸터/채팅 패널 없이 독립적으로 뜬다 -
 * 메타 광고 랜딩으로 그대로 재사용하기 위함. 실제 가입/승인 플로우
 * (/partner/register, 관리자 승인 단계)는 전혀 건드리지 않고, 그 앞에 가치를
 * 먼저 보여주는 화면만 끼워 넣는다.
 *
 * 실적 숫자(등록 지점 수 등)는 의도적으로 넣지 않는다 - 지금은 1곳뿐이라 오히려
 * 설득력을 깎는다. 대신 지금 살아있는 프로모션(6개월 무료·선착순 100개,
 * event_popups 확인됨)으로 설득한다. 미리보기 지점의 tagline은 표시하지 않는다
 * (W-060 - "최강" 같은 미검증 최상급 표현이 심사 대기 중).
 */
export default async function RegisterIntroPage() {
  const branch = await getPublicBranchDetail('정도-28268b5c');
  const previewImage = branch?.media.find((m) => m.type === 'image_main') ?? branch?.media[0];

  return (
    <div className="min-h-screen bg-surface">
      <header className="mx-auto flex max-w-xl items-center justify-between px-5 py-4">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-ink">
          {SITE_CONFIG.name}
        </Link>
      </header>

      <main className="mx-auto flex max-w-xl flex-col gap-8 px-5 pb-16 pt-4">
        <section className="flex flex-col items-center gap-3 text-center">
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600">
            지점 등록 · 선착순 100개
          </span>
          <h1 className="text-[28px] font-extrabold leading-tight text-ink">
            6개월 무료로
            <br />
            우리 지점을 등록하세요
          </h1>
          <p className="text-sm leading-relaxed text-ink-soft">
            보험맵은 전국 GA 지점 정보를 모으는 플랫폼입니다.
            <br />
            지금 등록하면 정착지원금 없이도 노출을 시작할 수 있어요.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          {BENEFITS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
              <Icon className="h-5 w-5 shrink-0 text-brand-500" />
              <div>
                <p className="text-sm font-bold text-ink">{label}</p>
                <p className="text-xs leading-relaxed text-ink-faint">{desc}</p>
              </div>
            </div>
          ))}
        </section>

        {branch && (
          <section className="flex flex-col gap-2">
            <p className="text-xs font-bold text-ink-faint">이렇게 노출됩니다 (실제 등록 지점 예시)</p>
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
              {previewImage && (
                <div className="relative aspect-video w-full bg-surface-sunken">
                  <Image src={previewImage.url} alt="" fill sizes="480px" className="object-cover" />
                </div>
              )}
              <div className="flex flex-col gap-1 p-4">
                <div className="flex items-center gap-1 text-xs font-semibold text-brand-600">
                  {branch.gaCompany.isVerified && <BadgeCheck className="h-3.5 w-3.5" />}
                  {branch.gaCompany.name}
                </div>
                <p className="text-base font-bold text-ink">{branch.name}</p>
                <p className="text-xs text-ink-faint">
                  {branch.sidoName} {branch.sigunguName}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="sticky bottom-4 pt-2">
          <HeroCtaButton
            href="/partner/register"
            label="무료로 등록하기"
            icon={<MapPinned className="h-6 w-6" strokeWidth={2.5} />}
            gradientClassName="from-brand-500 via-brand-600 to-brand-800"
            glowColor="rgba(37,99,235,0.45)"
          />
          <p className="mt-2 text-center text-[11px] text-ink-faint">등록 정보는 검토 후 승인되면 공개됩니다.</p>
        </section>
      </main>
    </div>
  );
}
