import type { Metadata } from 'next';
import Link from 'next/link';
import { UserPlus, MapPinned, FileText, Gift, ShieldCheck, Award } from 'lucide-react';
import { HeroCtaButton } from '@/components/home/HeroCtaButton';
import { SITE_CONFIG } from '@/lib/config/site';

export const metadata: Metadata = {
  title: '우리 지점 설계사 등록 — 완전 무료',
  description: '소속 지점을 연결하고 설계사로 등록하세요. 명함은 필수, 소득증빙은 선택입니다.',
  alternates: { canonical: '/branch-planner-register' },
};

/**
 * ③ ⓑ "우리 지점 설계사 등록"의 설명 경유 페이지(오너 지시, 2026-08-10) - "우리지점
 * 설계사 등록하기도 우리지점등록하기처럼 누르면 1차 설명글 나왔음 해". /register,
 * /top-designer-register와 동일 골격(배지-헤드-요건카드-CTA), (main) 레이아웃 밖에
 * 둬서 헤더/푸터 없이 독립적으로 뜬다. 명함·소득증빙 같은 민감 서류를 받는 폼이
 * 설명 없이 바로 열리면 안 된다는 원칙(TOP 설계사도 오늘 아침 f7bfd72로 동일하게
 * 통일)을 그대로 따른다.
 *
 * 문안은 콘텐츠팀 확정본 도착 전 임시 텍스트다(CTO 지시 - "틀만 먼저 만들고 임시
 * 텍스트로 진행"). 확정본이 오면 본문만 교체한다.
 */
const REQUIREMENT_STEPS = [
  { icon: MapPinned, title: '소속 지점 연결', desc: '보험맵에 등록된 지점을 검색해 연결합니다. 지점이 없으면 지점장님께 먼저 등록을 요청할 수 있어요.' },
  { icon: FileText, title: '명함 제출 (필수)', desc: '소속과 직급을 확인하기 위한 서류입니다.' },
  { icon: ShieldCheck, title: '소득증빙 (선택)', desc: '원천징수영수증을 함께 제출하면 TOP 설계사 인증도 신청할 수 있어요.' },
];

const TRUST_CARDS = [
  { icon: Gift, label: '완전 무료', desc: '등록·유지 전 과정에 비용이 없습니다.' },
  { icon: UserPlus, label: '본인이 직접 등록', desc: '지점장이 아니라 설계사 본인이 등록합니다.' },
  { icon: Award, label: 'TOP 설계사로 이어집니다', desc: '소득증빙까지 마치면 TOP 설계사 인증도 신청할 수 있어요.' },
];

export default function BranchPlannerRegisterIntroPage() {
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
            우리 지점 설계사 등록 · 완전 무료
          </span>
          <h1 className="text-[26px] font-extrabold leading-tight text-ink">
            내가 속한 지점,
            <br />
            내 이름으로 함께 올립니다
          </h1>
          <p className="text-sm leading-relaxed text-ink-soft">
            설계사 본인이 직접 등록합니다. 소속 지점을 연결하면
            <br />
            지점 페이지에 설계사님이 함께 표시됩니다.
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="bg-brand-700 px-4 py-2.5 text-sm font-bold text-white">어떻게 등록하나요</div>
          {REQUIREMENT_STEPS.map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className={`flex items-start gap-3 px-4 py-3 ${i > 0 ? 'border-t border-surface-sunken' : ''}`}>
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-bold text-brand-700">
                {i + 1}
              </span>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
                  <Icon className="h-3.5 w-3.5 text-brand-700" />
                  {title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-faint">{desc}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-3">
          {TRUST_CARDS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
              <Icon className="h-5 w-5 shrink-0 text-brand-500" />
              <div>
                <p className="text-sm font-bold text-ink">{label}</p>
                <p className="text-xs leading-relaxed text-ink-faint">{desc}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="sticky bottom-4 pt-2">
          <HeroCtaButton
            href="/branch-planner/register"
            label="무료로 등록하기"
            icon={<UserPlus className="h-6 w-6" strokeWidth={2.5} />}
            gradientClassName="from-brand-500 via-brand-600 to-brand-800"
            glowColor="rgba(37,99,235,0.45)"
          />
          <p className="mt-2 text-center text-[11px] text-ink-faint">
            명함은 필수, 소득증빙은 선택입니다. 미제출 시에도 등록되지만 TOP 인증은 받을 수 없습니다.
          </p>
        </section>
      </main>
    </div>
  );
}
