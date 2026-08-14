/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        // 지점 대표사진/사무실사진(branch_media, source='external')이 더미 데이터에서
        // Picsum 직접 링크를 쓴다 - next/image가 렌더링하려면 허용 호스트에 등록되어야 한다.
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'fastly.picsum.photos',
      },
    ],
    // AVIF를 우선 시도하고 미지원 브라우저는 WebP로 폴백 - next/image가 원본보다
    // 훨씬 작은 포맷을 자동으로 골라준다.
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverActions: {
      // 게시글 이미지 최대 5장 x 5MB 첨부를 감당하기 위해 기본 body 크기 제한을 상향한다.
      bodySizeLimit: '30mb',
    },
    // lucide-react처럼 아이콘 하나하나가 개별 모듈인 라이브러리를 배럴 임포트하면
    // 실제 안 쓰는 아이콘까지 번들에 딸려오기 쉽다 - 사용한 아이콘만 트리셰이킹되게 한다.
    optimizePackageImports: ['lucide-react'],
    // 🔴 클라이언트 Router Cache 비활성화 (2026-08-13, "승인했는데 안 보인다"의 나머지 절반)
    //
    // 서버 쪽 Data Cache는 src/lib/supabase/public.ts에서 껐다. 그것만으로는 증상이
    // 절반만 사라진다 - Next는 **브라우저 안에서도** RSC 응답을 따로 캐시한다.
    // 기본값은 동적 라우트 30초 / 정적 5분(prefetch-cache-utils.js:174-198)이라,
    // 방문자가 홈 → 지역 → 뒤로 → 지역 을 30초 안에 오가면 서버를 아예 다시 안 부르고
    // **직전 화면(승인 전 숫자)을 그대로 다시 그린다.** 오너의 "새로고침 한 번 하면
    // 돌아온다"가 바로 이 층이다 - 새로고침(F5)은 이 캐시를 통째로 버린다.
    //
    // 0으로 두면 prefetch 엔트리가 즉시 expired 판정되어(같은 파일 198행) 소프트 내비게이션도
    // 매번 서버를 부른다. 비용: 링크 이동마다 RSC 요청 1회. 이 사이트의 공개 페이지는
    // 이미 전부 force-dynamic이라 어차피 서버 렌더링이 일어나므로 실질 추가 비용이 작고,
    // 기준("승인했는데 안 보인다가 다시 나오면 안 된다")을 만족하는 유일한 값이다.
    staleTimes: { dynamic: 0, static: 0 },
  },
};

export default nextConfig;
