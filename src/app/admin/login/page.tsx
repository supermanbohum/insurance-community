import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/admin/session';
import { LoginForm } from '@/components/admin/LoginForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SITE_CONFIG } from '@/lib/config/site';

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) {
    redirect('/admin');
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{SITE_CONFIG.shortName} 관리자</CardTitle>
          <CardDescription>플랫폼 관리자 계정으로 로그인하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
