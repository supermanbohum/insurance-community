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
  },
};

export default nextConfig;
