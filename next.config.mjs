/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // 🔴 이미지 변환을 Vercel이 아니라 Supabase에서 한다 (2026-09-03).
    //    Vercel Hobby 의 Image Optimization 변환 한도 5,000/월을 소진해
    //    `/_next/image` 가 전부 HTTP 402 로 떨어졌고 **사이트 전 이미지가 죽었다.**
    //    사유·실측·대피로는 src/lib/images/loader.ts 주석에 전부 적어 뒀다.
    loader: 'custom',
    loaderFile: './src/lib/images/loader.ts',

    // 커스텀 로더를 쓰면 remotePatterns 검사와 formats 협상은 Next가 하지 않는다.
    // 포맷은 Supabase가 Accept 헤더를 보고 WebP로 내려준다(실측 289KB → 150KB).
    // 남겨 두는 이유: 로더를 되돌릴 때(원본 직행/Vercel 복귀) 이 목록이 다시 필요하다.
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

    // 변환 1회 = Supabase 요청 1회다. 폭 후보가 많을수록 같은 사진을 여러 번 변환한다.
    // 기본값(8단계 + 8단계)에서 실제로 쓰는 구간만 남겨 변환 가짓수를 줄인다.
    // 3840은 뺀다 - 원본이 그보다 작아 어차피 원본 크기로 수렴한다(실측).
    deviceSizes: [640, 828, 1080, 1920],
    imageSizes: [128, 256, 384],
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
