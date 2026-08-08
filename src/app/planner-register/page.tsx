import type { Metadata } from 'next';
import Link from 'next/link';
import { EyeOff, Gift, ShieldCheck, UserPlus } from 'lucide-react';
import { HeroCtaButton } from '@/components/home/HeroCtaButton';
import { SITE_CONFIG } from '@/lib/config/site';

export const metadata: Metadata = {
  title: '설계사 무료 등록 — 지점이 나를 찾습니다',
  description: '보험맵에 프로필을 등록하면 관리자가 먼저 연락합니다. 실명·소속·연락처는 공개되지 않고, 연락처는 동의한 경우에만 전달되며 언제든 철회할 수 있습니다.',
  alternates: { canonical: '/planner-register' },
};

/**
 * W-063 — "설계사 등록하기"의 새 목적지. /register(W-061①, 지점장용)와 같은 구조를
 * 이 그룹(main) 밖에 둔 독립 페이지지만, 대상과 메시지는 완전히 다르다 - 지점장에게는
 * "선점하세요"가 통하지만 설계사에게는 "이직 의사가 새어나가지 않는다"는 확신이
 * 핵심이다(INSIGHT_PLANNER_PSYCHOLOGY.md 익명욕구). 등록/승인 플로우
 * (/planner-market/register)는 건드리지 않는다.
 *
 * 3·4번째 섹션 문구는 실제로 동작하는 것만 적었다 - 아래 두 가지를 코드에서
 * 직접 확인한 뒤 반영했다:
 * - public_planner_profiles 뷰에 name/phone/현재소속 컬럼이 없음 (실명·소속·연락처
 *   비공개가 사실).
 * - PlannerMyProfileCard.tsx의 "개인정보 제공 철회" 버튼이 실제 서버 액션
 *   (revokeContact)을 호출하고 contact_sharing_revoked_at을 세팅함 (철회 가능이 사실).
 *
 * 미리보기 카드는 실제 등록된 개인 프로필(자기소개 등 본인이 쓴 문장 포함)을 쓰지
 * 않는다 - 지점(사업자)과 달리 개인의 자기소개 문장을 본인 동의 없이 광고 소재로
 * 쓰는 것은 다른 성격의 문제라고 판단했다(W-061① 지점 조회수 제거와 같은 원칙을
 * 더 보수적으로 적용). 대신 실제 공개 필드 구성 그대로의 예시로 대체한다.
 */
const REASONS = [
  { icon: EyeOff, label: '실명·소속·연락처는 공개되지 않습니다', desc: '공개되는 정보는 활동지역·경력·전문분야·희망조건뿐입니다' },
  { icon: Gift, label: '완전 무료', desc: '등록·열람 모두 설계사님에게는 비용이 없습니다' },
  { icon: ShieldCheck, label: '연락처는 동의한 경우에만 전달됩니다', desc: 'GA가 연락처를 보려면 회원님 동의가 필요하고, 언제든 철회할 수 있습니다' },
];

export default function PlannerRegisterIntroPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="mx-auto flex max-w-xl items-center justify-between px-5 py-4">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-ink">
          {SITE_CONFIG.name}
        </Link>
      </header>

      <main className="mx-auto flex max-w-xl flex-col gap-8 px-5 pb-16 pt-4">
        <section className="flex flex-col items-center gap-3 text-center">
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600">설계사 등록 · 완전 무료</span>
          <h1 className="text-[26px] font-extrabold leading-tight text-ink">
            지점을 찾아다니지 마세요.
            <br />
            관리자가 먼저 연락합니다.
          </h1>
          <p className="text-sm leading-relaxed text-ink-soft">
            활동지역·경력·전문분야를 등록해두면
            <br />
            관심 있는 관리자(지점장·본부장·단장)가 회원님을 찾아 연락합니다.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          {REASONS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
              <Icon className="h-5 w-5 shrink-0 text-brand-500" />
              <div>
                <p className="text-sm font-bold text-ink">{label}</p>
                <p className="text-xs leading-relaxed text-ink-faint">{desc}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-2">
          <p className="text-xs font-bold text-ink-faint">이런 정보가 공개됩니다 (예시)</p>
          <div className="overflow-hidden rounded-2xl border border-line bg-white p-4 shadow-card">
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className="rounded-full bg-surface-sunken px-2.5 py-1 font-semibold text-ink-soft">경기도 광명시</span>
              <span className="rounded-full bg-surface-sunken px-2.5 py-1 font-semibold text-ink-soft">경력 6년</span>
              <span className="rounded-full bg-surface-sunken px-2.5 py-1 font-semibold text-ink-soft">자동차보험</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              고객 상담 경험을 살려 꼼꼼하게 안내드립니다. 장기 근무 가능한 지점을 찾고 있습니다.
              <span className="ml-1 font-semibold text-ink-soft">(예시 문구)</span>
            </p>
          </div>
        </section>

        <section className="sticky bottom-4 pt-2">
          <HeroCtaButton
            href="/planner-market/register"
            label="무료로 등록하기"
            icon={<UserPlus className="h-6 w-6" strokeWidth={2.5} />}
            gradientClassName="from-brand-500 via-brand-600 to-brand-800"
            glowColor="rgba(37,99,235,0.45)"
          />
          <p className="mt-2 text-center text-[11px] text-ink-faint">등록 정보는 운영팀 검토 후 승인되면 공개됩니다.</p>
        </section>
      </main>
    </div>
  );
}
