import type { Metadata } from 'next';
import Link from 'next/link';
import { UserPlus, MapPinned, FileText, Gift, ShieldCheck, Award } from 'lucide-react';
import { HeroCtaButton } from '@/components/home/HeroCtaButton';
import { SITE_CONFIG } from '@/lib/config/site';

export const metadata: Metadata = {
  title: '우리 지점 설계사 등록',
  description: '소속 지점에 내 이름을 올리고, 인증 등급으로 지점 점수를 함께 쌓습니다. 설계사 본인이 직접 등록하며, 지점 연결이 필수입니다.',
  alternates: { canonical: '/branch-planner-register' },
};

/**
 * ③ ⓑ "우리 지점 설계사 등록"의 설명 경유 페이지(오너 지시, 2026-08-10) - "우리지점
 * 설계사 등록하기도 우리지점등록하기처럼 누르면 1차 설명글 나왔음 해". /register,
 * /top-designer-register와 동일 골격(배지-헤드-요건카드-CTA), (main) 레이아웃 밖에
 * 둬서 헤더/푸터 없이 독립적으로 뜬다. 명함·소득증빙 같은 민감 서류를 받는 폼이
 * 설명 없이 바로 열리면 안 된다는 원칙(TOP 설계사도 f7bfd72로 동일하게 통일)을 따른다.
 *
 * 문안은 콘텐츠팀 확정본(2026-08-11)이다. 이 페이지의 핵심 임무는 설계사Market과의
 * 차이를 갈라주는 것 - 둘 다 "설계사 등록"으로 읽혀서, 이직하려는 사람이 여기로
 * 잘못 들어오는 걸 막아야 한다.
 */
const REQUIREMENT_STEPS = [
  {
    icon: FileText,
    title: '명함 (필수)',
    desc: '소속과 직급을 확인하기 위해 필요합니다.',
  },
  {
    icon: ShieldCheck,
    title: '원천징수영수증 (선택)',
    desc: '첨부하시면 TOP 설계사 인증을 함께 신청할 수 있습니다. 주민등록번호는 가리고 올려주세요. 서류는 심사에만 사용하고, 심사가 끝나면 즉시 파기합니다.',
  },
];

/** 소득증빙 첨부 여부에 따라 결과가 갈리는 지점 - 첨부를 강요하지 않되(등록은 그대로
 * 된다) 무엇을 얻고 무엇을 못 얻는지 미리 알려 나중에 "몰랐다"가 안 나오게 한다. */
const ATTACH_OUTCOMES = [
  {
    label: '첨부하시면',
    desc: '심사를 거쳐 TOP 설계사 인증이 함께 진행됩니다. 별도로 신청하실 필요가 없습니다. 승인되면 별등급(⭐1억 ~ ⭐⭐⭐⭐5억)이 표시됩니다.',
  },
  {
    label: '첨부하지 않으셔도',
    desc: "등록은 그대로 됩니다. 다만 TOP 설계사 인증은 신청할 수 없고, 지점 점수에는 '1억 미만'으로 집계됩니다. 인증은 나중에 언제든 추가할 수 있습니다.",
  },
];

const AFTER_REGISTER = [
  '소속 지점 페이지에 함께 표시됩니다.',
  '등록과 인증 등급이 그 지점의 우수GA 점수에 반영됩니다.',
  '심사는 운영팀이 확인한 뒤 처리해 드립니다.',
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
          <h1 className="text-[26px] font-extrabold leading-tight text-ink">우리 지점 설계사 등록</h1>
          <p className="text-sm leading-relaxed text-ink-soft">
            소속 지점에 내 이름을 올리고, 인증 등급으로 지점 점수를 함께 쌓습니다.
          </p>
        </section>

        {/* 가장 먼저 읽혀야 하는 2줄 - 이 페이지에서 가장 흔한 오해 두 가지(지점장이
            대신 등록 / 지점 없이도 등록)를 히어로 바로 아래에서 미리 끊는다. */}
        <section className="flex flex-col gap-2">
          <div className="flex items-start gap-2.5 rounded-2xl border border-brand-200 bg-brand-50/60 p-3.5">
            <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <p className="text-sm leading-relaxed text-ink-soft">
              <strong className="font-bold text-ink">설계사 본인이 직접 등록합니다</strong> — 지점장님이 대신 등록하는 기능이 아닙니다.
            </p>
          </div>
          <div className="flex items-start gap-2.5 rounded-2xl border border-brand-200 bg-brand-50/60 p-3.5">
            <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <p className="text-sm leading-relaxed text-ink-soft">
              <strong className="font-bold text-ink">소속 지점이 보험맵에 등록되어 있어야 합니다</strong> — 지점 연결이 필수입니다.
            </p>
          </div>
        </section>

        {/* 🔴 이 페이지의 핵심 임무 - 설계사Market과 헷갈려서 이직 희망자가 여기로 오는 걸
            막는다. 임무는 그대로이고 수단만 바뀌었다: 예전에는 4행짜리 비교표로 두 등록의
            차이를 설명했는데, 오너 지시(2026-08-11)로 표를 걷어내고 아래 두 문장만 남겼다.
            표가 하던 구분을 이 문장이 이미 하고 있다 - 표는 같은 말을 네 줄로 늘린 것이었다.
            🔴 표가 없다고 되살리지 말 것. 지운 게 아니라 문장으로 대체한 것이다. */}
        <section className="flex flex-col gap-3">
          <p className="text-xs leading-relaxed text-ink-soft">
            이직을 알아보고 계신다면{' '}
            <Link href="/planner-market/search" className="font-bold text-brand-600 underline underline-offset-2">
              설계사Market
            </Link>
            을 이용해 주세요. 이 페이지는 <strong className="font-bold text-ink">지금 소속된 지점에 내 이름을 올리는 곳</strong>입니다.
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="bg-brand-700 px-4 py-2.5 text-sm font-bold text-white">준비물</div>
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
          {ATTACH_OUTCOMES.map(({ label, desc }) => (
            <div key={label} className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
              <ShieldCheck className="h-5 w-5 shrink-0 text-brand-500" />
              <div>
                <p className="text-sm font-bold text-ink">{label}</p>
                <p className="text-xs leading-relaxed text-ink-faint">{desc}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4 shadow-card">
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
            <Award className="h-4 w-4 text-brand-500" />
            등록하면
          </p>
          <ul className="flex flex-col gap-1.5">
            {AFTER_REGISTER.map((line) => (
              <li key={line} className="flex items-start gap-2 text-xs leading-relaxed text-ink-faint">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                {line}
              </li>
            ))}
          </ul>
        </section>

        <section className="sticky bottom-4 pt-2">
          <HeroCtaButton
            href="/branch-planner/register"
            label="등록하기"
            icon={<UserPlus className="h-6 w-6" strokeWidth={2.5} />}
            gradientClassName="from-brand-500 via-brand-600 to-brand-800"
            glowColor="rgba(37,99,235,0.45)"
          />
          <p className="mt-2 text-center text-[11px] text-ink-faint">등록은 무료입니다.</p>
        </section>
      </main>
    </div>
  );
}
