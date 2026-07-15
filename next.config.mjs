/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  experimental: {
    serverActions: {
      // 게시글 이미지 최대 5장 x 5MB 첨부를 감당하기 위해 기본 body 크기 제한을 상향한다.
      bodySizeLimit: '30mb',
    },
  },
};

export default nextConfig;
