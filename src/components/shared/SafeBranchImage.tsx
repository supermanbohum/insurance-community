import Image from 'next/image';

// next.config.mjs의 images.remotePatterns와 반드시 동일하게 유지한다 - 여기
// 없는 호스트는 next/image 최적화 요청 자체가 "Invalid src prop" 에러로
// 죽는다. branch_media.source='external'은 GA 파트너가 임의 도메인 URL을
// 입력할 수 있는 필드라(BranchGallery.tsx가 이미 같은 이유로 source==='storage'
// 일 때만 next/image를 쓰고 있다), mainImageUrl처럼 source 정보 없이 최종
// URL 문자열만 넘어오는 곳에서는 호스트를 직접 검사해서 안전할 때만
// next/image를 쓰고, 그 외에는 최적화 없는 원본 <img>로 안전하게 폴백한다.
const OPTIMIZABLE_HOSTS = [/(^|\.)supabase\.co$/, /^picsum\.photos$/, /^fastly\.picsum\.photos$/];

function isOptimizableHost(url: string): boolean {
  try {
    return OPTIMIZABLE_HOSTS.some((re) => re.test(new URL(url).hostname));
  } catch {
    return false;
  }
}

/** 지점 대표사진처럼 "Storage 경로 또는 GA 파트너가 입력한 임의 외부 URL"
 * 둘 다 될 수 있는 이미지를 안전하게 렌더링한다. fill 레이아웃 전용. */
export function SafeBranchImage({
  src,
  alt,
  sizes,
  className,
  priority,
  onLoad,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  /** 실제로 그려진 <img>의 로드 완료. `e.currentTarget.naturalWidth/Height`로 원본 비율을
   *  알 수 있다 - **이미 받은 이미지**를 재는 것이라 추가 요청이 없다(FitPhoto가 쓴다). */
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}) {
  if (isOptimizableHost(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        loading={priority ? undefined : 'lazy'}
        priority={priority}
        sizes={sizes}
        className={className}
        onLoad={onLoad}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? undefined : 'lazy'}
      onLoad={onLoad}
      className={`absolute inset-0 h-full w-full ${className ?? ''}`}
    />
  );
}
