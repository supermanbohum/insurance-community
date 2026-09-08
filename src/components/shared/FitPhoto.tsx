'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { SafeBranchImage } from '@/components/shared/SafeBranchImage';

/**
 * 사진을 **비율에 맞게 알아서** 카드에 넣는다 (오너 지시 2026-09-04:
 * 「홈페이지에 나타나는 사진은 알아서 알맞게 축소해서 보이게는 안 되는거냐」).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 「하나로 통일」이 안 되는가 - 두 번 다 실패했다
 * ─────────────────────────────────────────────────────────────────────────────
 * 카드 틀은 `aspect-[4/3]` 고정이다. 여기에 비율이 제각각인 지점 사진을 넣는다.
 *
 *   전부 `object-cover`   틀은 꽉 차지만 **넘치는 부분을 잘라낸다.**
 *                         384x4000(세로 10배) 사진은 가운데 한 줄만 보이고,
 *                         대표사진이 로고면 「HC본부」 같은 글자가 잘려 나간다.
 *   전부 `object-contain` 사진 전체는 보이지만 **폭이 좁아지고 양옆에 띠**가 남는다.
 *                         오너 지적 그대로 「짤린것처럼 보이잖아 꽉차지않고」.
 *
 * 즉 **한쪽으로 통일하면 반드시 다른 쪽이 망가진다.** 사진마다 답이 다르기 때문이다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 그래서 사진 비율을 보고 자동으로 고른다
 * ─────────────────────────────────────────────────────────────────────────────
 *   비율 0.62 ~ 2.90   → cover   (꽉 찬다. 잘려도 자연스러운 범위다)
 *   그 밖(극단)        → contain + 같은 사진의 흐린 배경 (전체가 보인다)
 *
 * 실측으로 확인한 판정(2026-09-04, 홈 신규등록 카드):
 *   0.72 세로 인물 사진   → cover    꽉 찬다
 *   0.44 긴 사진          → contain  전체가 보인다
 *   0.19 아주 긴 홍보 이미지 → contain
 *
 * 🔴 비율은 **이미 받은 이미지**의 naturalWidth/Height 로 잰다. 따로 받지 않는다.
 *    리사이즈는 비율을 유지하므로 축소본에서 재도 원본 비율과 같다.
 * 🔴 배경(흐림)은 본체와 **src·sizes 가 같다.** 같은 URL 이라 브라우저가 한 번만 받는다.
 * 🔴 첫 그림은 cover 다. 대부분이 cover 이므로 전환은 극단 사진에서만 일어난다.
 *
 * ⚠️ **`onLoad` prop 하나만 믿으면 안 된다**(2026-09-04에 여기서 한 번 틀렸다).
 *    SSR로 나간 이미지가 브라우저 캐시에 있으면 하이드레이션 시점에 이미 `complete`라
 *    load 이벤트가 **다시 오지 않는다.** 그래서 비율 0.19/0.44 사진이 cover 그대로였다.
 *    지금은 마운트 시 실제 <img>를 찾아 `complete`면 즉시 재고, 아니면 load를 기다린다.
 */

/** 카드(4:3=1.333) 기준. 이 범위를 벗어나면 잘리는 양이 너무 커진다. */
const MIN_COVER_RATIO = 0.62;
const MAX_COVER_RATIO = 2.9;

export function FitPhoto({
  src,
  alt,
  sizes,
  priority,
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** 본체에만 붙는다. 호버 확대 같은 카드별 효과를 넘길 때 쓴다. */
  className?: string;
}) {
  const [contain, setContain] = useState(false);
  // display:contents 라 레이아웃에 상자를 만들지 않는다 - fill 이미지의 기준은
  // 그대로 바깥 카드(relative)로 유지된다. DOM 에는 있으므로 querySelector 는 된다.
  const hostRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const img = host.querySelector('img');
    if (!img) return;

    const apply = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      if (!w || !h) return;
      const ratio = w / h;
      setContain(ratio < MIN_COVER_RATIO || ratio > MAX_COVER_RATIO);
    };

    if (img.complete) apply(); // 캐시에서 즉시 온 경우 - load 는 다시 오지 않는다
    img.addEventListener('load', apply);
    return () => img.removeEventListener('load', apply);
  }, [src]);

  return (
    <span ref={hostRef} className="contents">
      {/* 축소해서 넣을 때만 뒤를 채운다. cover 면 본체가 이미 꽉 차므로 그리지 않는다. */}
      {contain && (
        <span aria-hidden className="pointer-events-none absolute inset-0 block overflow-hidden">
          <SafeBranchImage src={src} alt="" sizes={sizes} className="scale-125 object-cover opacity-40 blur-2xl" />
        </span>
      )}

      <SafeBranchImage
        src={src}
        alt={alt}
        sizes={sizes}
        priority={priority}
        className={cn(contain ? 'object-contain' : 'object-cover', className)}
      />
    </span>
  );
}
