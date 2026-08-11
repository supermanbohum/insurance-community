import Link from 'next/link';
import type { PublicBanner } from '@/lib/public/banners';

/**
 * 홈 광고 지면(SPEC-040) - 「🏅 우수 GA」 바로 위.
 *
 * 🔴 소재가 없으면 아무것도 그리지 않는다. 좌측 pc_left 슬롯이 폐지된 이유가
 * 정확히 이것이었다(W-051, SPEC-004 §3) - 소재 없는 슬롯에 "광고 영역(준비 중)"
 * 점선 박스를 띄우는 게 디자인 스펙 위반이었다. 여기서도 빈 지면은 렌더하지 않는다.
 * 호출부에서 banner가 null이면 이 컴포넌트를 부르지 않는다.
 *
 * 🔴 이미지를 코드에 하드코딩하지 않는다. 자체 광고(house ad)도 다른 광고와
 * 똑같이 banners 테이블에 올려서 내보낸다 - 그래야 게재 기간·우선순위·중단이
 * 관리자 화면에서 동일하게 통제된다. 코드에 박으면 내리려면 배포를 해야 한다.
 */
export function HomeAdSlot({ banner }: { banner: PublicBanner }) {
  // 지면은 전 기기 동일하다. 모바일 소재를 기본으로 쓰고 없으면 PC 소재로 떨어진다
  // - 관리자가 둘 중 하나만 올려도 지면이 비지 않게 하기 위함이다.
  const src = banner.mobileImageUrl ?? banner.pcImageUrl;
  if (!src) return null;

  const isExternal = /^https?:\/\//i.test(banner.linkUrl);

  return (
    <Link
      href={banner.linkUrl}
      // 외부 광고주 링크는 새 탭으로 연다. 사이트 안에서 도는 자체 광고는
      // 같은 탭이 자연스럽다.
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer sponsored' } : {})}
      className="relative block overflow-hidden rounded-2xl"
      // 335×112(=670×224의 1/2) 비율을 고정한다. 폭은 컨테이너를 따라가되 비율이
      // 유지돼야 소재가 잘리거나 늘어나지 않는다.
      style={{ aspectRatio: '335 / 112' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" />
      {/* 🔴 「광고」 표시는 코드가 보장한다. 소재 안에 그려 넣은 것에 기대면
          광고주가 올린 이미지에는 표시가 없을 수 있고, 그건 표시광고 위반이다.
          자체 광고에도 예외 없이 붙인다(CTO 확정). */}
      <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
        광고
      </span>
    </Link>
  );
}
