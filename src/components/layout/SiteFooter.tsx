import Link from 'next/link';
import { MessageCircle, Mail } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';
import { COMPANY_INFO as COMPANY } from '@/lib/config/site';

const MENU_LINKS = [
  { href: '/terms', label: '이용약관' },
  { href: '/privacy', label: '개인정보처리방침' },
  { href: '/refund-policy', label: '환불정책' },
  { href: '/delete-account', label: '데이터 삭제 요청' },
  { href: '/contact', label: '고객센터' },
];

// 국세청 홈택스는 사업자등록번호를 URL 파라미터로 바로 조회하는 방식을 제공하지 않아
// (직접 조회 화면에서 번호를 입력해야 함) 정확한 상태조회 결과 페이지로 바로 연결할 수는
// 없다 - 대신 실제로 존재하는 홈택스 공식 홈으로 연결해 "전체메뉴 > 증명·등록·신청·
// 사업장현황 > 사업자상태조회"에서 직접 조회하도록 안내한다.
const BIZ_LOOKUP_URL = 'https://www.hometax.go.kr';

export function SiteFooter() {
  return (
    <footer className="mt-10 bg-gradient-to-b from-[#152d70] to-[#0a1230] text-slate-300">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-5 py-10 sm:gap-10 sm:px-8 sm:py-12 lg:grid lg:grid-cols-[1.3fr_0.8fr_1fr] lg:gap-12">
        {/* 브랜드 + 사업자 정보 */}
        <div className="flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white ring-1 ring-white/15">
              <BrandMark className="h-4 w-4" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-white">보험맵</span>
          </Link>
          <p className="text-sm text-slate-400">전국 보험대리점 정보 플랫폼</p>

          <dl className="mt-1 flex flex-col gap-1 text-[13px] leading-relaxed text-slate-400">
            <div className="flex flex-wrap gap-x-1.5">
              <dt className="text-slate-500">상호</dt>
              <dd>{COMPANY.name}</dd>
              <span className="text-slate-600">·</span>
              <dt className="text-slate-500">대표자</dt>
              <dd>{COMPANY.ceo}</dd>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <dt className="text-slate-500">사업자등록번호</dt>
              <dd>
                <a
                  href={BIZ_LOOKUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-slate-600 underline-offset-2 transition-colors hover:text-white hover:decoration-slate-400"
                >
                  {COMPANY.bizNo}
                </a>
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-1.5">
              <dt className="text-slate-500">주소</dt>
              <dd>{COMPANY.address}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1.5">
              <dt className="text-slate-500">통신판매업신고번호</dt>
              <dd>{COMPANY.mailOrderBizNo || '발급 후 입력 예정'}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1.5">
              <dt className="text-slate-500">고객센터 전화</dt>
              <dd>{COMPANY.phone || '추후 등록'}</dd>
            </div>
          </dl>
        </div>

        {/* 메뉴 */}
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">메뉴</span>
          {MENU_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className="w-fit text-sm text-slate-300 transition-colors hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>

        {/* 고객센터 / 제휴문의 */}
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">문의</span>
          <a
            href={COMPANY.kakaoChannelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-white/5 px-3.5 py-3 text-sm text-slate-200 ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
          >
            <MessageCircle className="h-4 w-4 shrink-0 text-[#FEE500]" />
            <span className="flex flex-col">
              <span className="font-semibold">카카오톡 문의</span>
              <span className="text-xs text-slate-400">고객센터 실시간 상담</span>
            </span>
          </a>
          <a
            href={`mailto:${COMPANY.email}`}
            className="flex items-center gap-2 rounded-xl bg-white/5 px-3.5 py-3 text-sm text-slate-200 ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Mail className="h-4 w-4 shrink-0 text-brand-300" />
            <span className="flex flex-col">
              <span className="font-semibold">광고·제휴문의</span>
              <span className="text-xs text-slate-400">{COMPANY.email}</span>
            </span>
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-4xl px-5 py-5 sm:px-8">
          <p className="text-[11px] text-slate-500">&copy; 2026 BOHUMMAP. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
