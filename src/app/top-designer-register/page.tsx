import type { Metadata } from 'next';
import Link from 'next/link';
import { Award, FileText, ShieldCheck, CheckCircle2, Gift, Lock, Eye } from 'lucide-react';
import { HeroCtaButton } from '@/components/home/HeroCtaButton';
import { SITE_CONFIG } from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'TOP 설계사 인증 — 완전 무료',
  description: '국세청 원천징수영수증으로 연봉을 인증하고 운영팀 심사를 통과하면, 인증 배지와 함께 나만의 상세 페이지가 열립니다.',
  alternates: { canonical: '/top-designer-register' },
};

/**
 * SPEC-032 v3 — TOP 설계사 등록 설명 페이지. /register·/planner-register와 같은
 * 골격(배지-헤드-부연-안심카드-CTA)에 요건 블록(§1.5 "3.5")만 추가한 구조다.
 *
 * 오너 확정(2026-08-09): ①완전 무료 ②요건=고연봉+원천징수영수증+운영팀심사
 * ③승인까지 받아야 개인 상세페이지가 열림 ④실명·GA·본부 공개 허용(사진만 선택).
 * 이 페이지는 "실명 비공개"를 약속하지 않는다 - TOP은 공개가 곧 가치다.
 *
 * 골드(gold-*)는 이 페이지에서만 쓴다 - 브랜드 블루(/register, /planner-register)와
 * 구분해 "인증"의 시각 언어로 둔다(디자인 확정). 네이비는 brand-900(#152d70, 구 브랜드색
 * 보존값)을 재사용한다 - 별도 navy 토큰이 tailwind.config에 없다.
 *
 * 지점 유인 층 1줄(미리보기 캡션 위, 이중 독해 문구)은 콘텐츠팀 확정 문안 대기 중이라
 * 아직 넣지 않았다 - 도착하면 바로 추가한다.
 *
 * CTA는 현재 실제로 동작하는 /top-designer/apply로 보낸다(설계사마켓 프로필이 없으면
 * 그쪽에서 안내). TOP 설계사가 마켓과 구조적으로 분리되면(진행 중) 신규 독립 신청
 * 라우트로 교체한다.
 */
const REQUIREMENT_STEPS = [
  { icon: FileText, title: '원천징수영수증 제출', desc: '국세청 발급 서류입니다. 자기 신고가 아닙니다.' },
  { icon: ShieldCheck, title: '운영팀 심사', desc: '실제 연봉 기준을 충족해야 합니다.' },
  { icon: CheckCircle2, title: '승인', desc: '인증 배지가 붙고, 개인 상세 페이지가 활성화됩니다.' },
];

const TRUST_CARDS = [
  { icon: Gift, label: '완전 무료', desc: '신청·심사·유지 전 과정에 비용이 없습니다.' },
  { icon: FileText, label: '국세청 서류 기반', desc: '원천징수영수증으로 확인합니다. 자기 신고 인증이 아닙니다.' },
  { icon: Lock, label: '사진 공개는 선택', desc: '비공개를 선택하면 열람권으로도 볼 수 없습니다.' },
];

export default function TopDesignerRegisterIntroPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="mx-auto flex max-w-xl items-center justify-between px-5 py-4">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-ink">
          {SITE_CONFIG.name}
        </Link>
      </header>

      <main className="mx-auto flex max-w-xl flex-col gap-8 px-5 pb-16 pt-4">
        <section className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/40 bg-gold-50 px-3 py-1 text-xs font-bold text-gold-600">
            <Award className="h-3.5 w-3.5" />
            TOP 설계사 인증 · 완전 무료
          </span>
          <h1 className="text-[26px] font-extrabold leading-tight text-ink">
            잘하는 설계사는 많습니다.
            <br />
            <span className="text-brand-900">증명된 설계사는 드뭅니다.</span>
          </h1>
          <p className="text-sm leading-relaxed text-ink-soft">
            국세청 원천징수영수증으로 연봉을 인증하고 운영팀 심사를 통과하면,
            <br />
            인증 배지와 함께 나만의 상세 페이지가 열립니다.
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="bg-brand-900 px-4 py-2.5 text-sm font-bold text-white">어떻게 증명하나요</div>
          {REQUIREMENT_STEPS.map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className={`flex items-start gap-3 px-4 py-3 ${i > 0 ? 'border-t border-surface-sunken' : ''}`}>
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-bold text-brand-900">
                {i + 1}
              </span>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
                  <Icon className="h-3.5 w-3.5 text-brand-900" />
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
              <Icon className="h-5 w-5 shrink-0 text-gold-500" />
              <div>
                <p className="text-sm font-bold text-ink">{label}</p>
                <p className="text-xs leading-relaxed text-ink-faint">{desc}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-2">
          <p className="text-xs font-bold text-ink-faint">승인되면, 나만의 페이지를 갖게 됩니다</p>
          <div className="overflow-hidden rounded-2xl border border-gold-400/40 bg-white shadow-card">
            <div className="bg-gradient-to-br from-brand-900 via-brand-900 to-[#0E1F52] px-5 py-6 text-center text-white">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-xl font-bold">김</div>
              <p className="mt-2 text-base font-bold">김◯◯ 설계사</p>
              <p className="mt-0.5 text-[11px] text-white/70">한국GA · 강남본부(서초지점) · 예시</p>
              <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-gold-400/50 bg-white/10 px-3 py-1 text-[11px] font-bold">
                <span className="text-gold-400">⭐⭐⭐</span>연봉 3억 등급
              </p>
            </div>
            <div className="border-t border-gold-50 bg-gold-50/60 px-4 py-2.5 text-[10.5px] leading-relaxed text-ink-soft">
              <span className="font-bold text-gold-600">✔ 국세청 서류로 확인된 등급</span> · 원천징수영수증 인증
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-ink-faint">
            <span className="font-semibold text-ink-soft">승인 전에는 페이지가 만들어지지 않습니다.</span> 사진 공개 여부는 등록할 때
            선택합니다(실명·소속은 공개).
          </p>
        </section>

        <section className="sticky bottom-4 pt-2">
          <HeroCtaButton
            href="/top-designer/apply"
            label="무료로 인증 신청하기"
            icon={<Eye className="h-6 w-6" strokeWidth={2.5} />}
            gradientClassName="from-gold-400 via-gold-500 to-gold-600"
            glowColor="rgba(196,138,15,0.45)"
            textClassName="text-[#0E1F52]"
          />
          <p className="mt-2 text-center text-[11px] text-ink-faint">
            원천징수영수증은 심사에만 사용하며, 연봉 금액은 화면에 표시되지 않습니다(등급만 표시).
          </p>
        </section>
      </main>
    </div>
  );
}
