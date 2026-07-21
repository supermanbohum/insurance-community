import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: '보험맵 관리자',
  robots: { index: false, follow: false },
};

/**
 * /admin 전체(로그인 화면 포함)에 적용되는 최상위 레이아웃.
 * 실제 접근 제어(requireAdmin)는 admin/(protected)/layout.tsx가 담당한다 -
 * /admin/login까지 여기서 막으면 리다이렉트 루프가 생기기 때문에 분리했다.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
      <Toaster position="top-center" />
    </div>
  );
}
