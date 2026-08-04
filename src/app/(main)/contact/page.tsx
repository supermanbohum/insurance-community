import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageCircle, Mail, Building2, ExternalLink } from 'lucide-react';
import { LegalPageLayout, LegalSection } from '@/components/legal/LegalPageLayout';
import { COMPANY_INFO } from '@/lib/config/site';

export const metadata: Metadata = {
  title: '문의하기',
  description: '보험맵 서비스 이용, 제휴, 광고, 오류 신고 등 문의사항을 카카오톡 또는 이메일로 접수하세요.',
  alternates: { canonical: '/contact' },
};

const CONTACT_CHANNELS = [
  {
    icon: MessageCircle,
    iconClassName: 'text-[#3C1E1E]',
    iconBgClassName: 'bg-[#FEE500]',
    title: '카카오톡 문의',
    description: '가장 빠르게 답변받을 수 있는 채널입니다.',
    href: COMPANY_INFO.kakaoChannelUrl,
    label: '카카오톡 채널 열기',
    external: true,
  },
  {
    icon: Mail,
    iconClassName: 'text-white',
    iconBgClassName: 'bg-brand-500',
    title: '이메일 문의',
    description: '서비스 오류, 제휴·광고, 계정 관련 문의는 이메일로도 접수 가능합니다.',
    href: `mailto:${COMPANY_INFO.email}`,
    label: COMPANY_INFO.email,
    external: true,
  },
];

const INQUIRY_TYPES = [
  '서비스 이용 방법 문의',
  '지점·설계사 정보 오류 신고',
  'GA·지점 파트너 등록 및 제휴 문의',
  '광고·마케팅 제휴 문의',
  '계정, 로그인 관련 문의',
  '기타 서비스 개선 의견',
];

/** 문의하기 - Google Play 심사(지원 연락처 필수)와 일반 고객 문의를 함께 처리하는
 * 공개 페이지. 별도의 문의 폼/DB는 두지 않고 이미 운영 중인 카카오톡 채널/이메일로
 * 안내한다 - 응답 채널을 하나로 모아야 놓치는 문의 없이 관리할 수 있기 때문이다. */
export default function ContactPage() {
  return (
    <LegalPageLayout title="문의하기" effectiveDate="연중무휴 접수, 영업일 기준 답변" dateLabel="운영 안내">
      <LegalSection title="문의 채널">
        <p>보험맵 이용 중 궁금하신 점이나 불편사항은 아래 채널로 언제든지 문의해 주세요.</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          {CONTACT_CHANNELS.map((channel) => (
            <a
              key={channel.title}
              href={channel.href}
              target={channel.external ? '_blank' : undefined}
              rel={channel.external ? 'noopener noreferrer' : undefined}
              className="flex flex-1 items-start gap-3 rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-brand-soft)] p-4 transition-transform hover:-translate-y-0.5"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${channel.iconBgClassName} ${channel.iconClassName}`}>
                <channel.icon className="h-4.5 w-4.5" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1 text-[14px] font-bold text-[var(--lp-ink)]">
                  {channel.title}
                  <ExternalLink className="h-3 w-3 text-[var(--lp-ink-faint)]" />
                </span>
                <span className="text-[12px] text-[var(--lp-ink-faint)]">{channel.description}</span>
                <span className="mt-1 text-[13px] font-medium text-[var(--lp-brand)]">{channel.label}</span>
              </span>
            </a>
          ))}
        </div>
        <p className="mt-1 text-[13px] text-[var(--lp-ink-faint)]">
          영업일 기준 2~3일 이내 답변드리며, 문의가 많은 시기에는 다소 지연될 수 있는 점 양해 부탁드립니다.
        </p>
      </LegalSection>

      <LegalSection title="이런 문의를 받고 있어요">
        <ul className="flex flex-col gap-1.5 pl-4">
          {INQUIRY_TYPES.map((item) => (
            <li key={item} className="list-disc marker:text-[var(--lp-ink-faint)]">
              {item}
            </li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection title="계정·데이터 삭제 요청">
        <p>
          회원 탈퇴 및 보유 개인정보 삭제를 원하시는 경우{' '}
          <Link href="/delete-account" className="font-medium text-[var(--lp-brand)] underline underline-offset-2">
            데이터 삭제 요청 안내 페이지
          </Link>
          를 확인해 주세요.
        </p>
      </LegalSection>

      <LegalSection title="사업자 정보">
        <div className="flex items-start gap-2 text-[14px]">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--lp-ink-faint)]" />
          <p>
            {COMPANY_INFO.name} · 대표 {COMPANY_INFO.ceo} · 사업자등록번호 {COMPANY_INFO.bizNo}
            <br />
            {COMPANY_INFO.address}
          </p>
        </div>
      </LegalSection>
    </LegalPageLayout>
  );
}
