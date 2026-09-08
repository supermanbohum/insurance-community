import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * 지점 사진을 **원본 비율 그대로** 그린다. 폭을 채우고 높이는 사진이 정한다.
 * 잘라내지도, 늘리지도, 여백을 만들지도 않는다.
 *
 * 오너 확정(2026-09-04):
 *   「사진 화질을 제일 좋게 사진별(지점별) 딱맞게 안되냐? 꽉차게 안해도되니
 *     다만, 전체사진이 가능한 다 보이게. 좀더 축소해도좋으니」
 *   → 실제 사진 3장으로 4가지 틀을 렌더해 보여드리고 **「사진마다 높이 딱 맞춤」** 을 고르셨다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 이 방식인가 - 고정 틀에서는 셋 다 만족할 수 없었다
 * ─────────────────────────────────────────────────────────────────────────────
 *   cover    잘라낸다      → 전체가 안 보인다
 *   contain  여백이 남는다 → 공백이 생긴다
 *   fill     늘려서 맞춘다 → 찌그러진다
 * 셋 다 **틀이 고정이라서** 생기는 문제다. 틀을 사진에 맞추면 셋 다 사라진다.
 *
 * 여기까지 온 경로 (같은 자리를 또 돌지 않도록 남긴다)
 *   1차 cover(가운데)       가운데 한 줄만 보임 — 최초 신고
 *   2차 contain 통일        양옆에 띠 → 「짤린것처럼 보이잖아 꽉차지않고」
 *   3차 비율 자동 판정      대상이 전부 극단이라 2차와 같은 화면
 *   4차 cover + object-top  꽉 찼지만 아래가 잘림 → 「이게 아니다」
 *   5차 fill                전체 보임 + 공백 없음, 그러나 눌림
 *   6차 **자연 비율** ← 지금  틀을 사진에 맞춘다
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 상한(maxHeightClass)이 반드시 필요하다
 * ─────────────────────────────────────────────────────────────────────────────
 * 상한이 없으면 세로로 긴 사진이 **카드 하나를 화면보다 크게** 만든다.
 * 실측(2026-09-04): 더블유에셋 대표사진은 세로 5.9배다. 카드 폭 210px 기준
 * 높이가 **1,235px** 가 된다 — 신규등록 섹션 하나가 화면 두 개를 먹는다.
 * 상한에 걸린 사진만 그 안에서 축소되고(`object-contain`), 좌우에 여백이 조금 생긴다.
 * 상한 아래인 사진은 **여백 없이 딱 맞는다.**
 *
 * ⚠️ 근본 원인은 여전히 **사진 비율**이다. 지금 홈 대표사진은 세로 2.3~5.9배인
 *    카톡·인스타용 세로 홍보물이다. **가로로 찍은 사무실 실사진**으로 바꾸면
 *    상한에 걸리지 않아 전부 여백 없이 딱 맞는다. 그게 진짜 해결이다.
 *
 * ⚠️ 원본 크기를 DB에 갖고 있지 않아 `width={0} height={0}` + CSS 로 자연 비율을 낸다
 *    (Next 공식 반응형 패턴). 로드 전 높이를 모르므로 호출부 컨테이너에
 *    `min-h-*` 를 두어 레이아웃이 튀는 것을 줄인다.
 */
export function FitPhoto({
  src,
  alt,
  sizes,
  priority,
  className,
  maxHeightClass = 'max-h-[420px]',
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  /** 카드가 세로로 무한정 길어지지 않게 막는다. 위 주석의 이유를 읽고 바꿔라. */
  maxHeightClass?: string;
}) {
  const shared = cn('block h-auto w-full object-contain', maxHeightClass, className);

  // next.config 의 remotePatterns 밖 호스트(파트너가 입력한 임의 URL)는 최적화가
  // 실패하므로 원본 <img> 로 내보낸다 - 판정 기준은 SafeBranchImage 와 같다.
  if (!isOptimizableHost(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading={priority ? undefined : 'lazy'} className={shared} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      // 🔴 원본 크기를 모른다. 0/0 + CSS 로 자연 비율을 내는 것이 Next 공식 패턴이다.
      width={0}
      height={0}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : 'lazy'}
      className={shared}
    />
  );
}

// SafeBranchImage 와 동일한 판정. 두 곳이 어긋나면 「어떤 사진만 안 나온다」가 된다.
const OPTIMIZABLE_HOSTS = [/(^|\.)supabase\.co$/, /^picsum\.photos$/, /^fastly\.picsum\.photos$/];

function isOptimizableHost(url: string): boolean {
  try {
    return OPTIMIZABLE_HOSTS.some((re) => re.test(new URL(url).hostname));
  } catch {
    return false;
  }
}
