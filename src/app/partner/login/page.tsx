import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentPartner } from '@/lib/partner/session';
import { PartnerLoginForm } from '@/components/partner/PartnerLoginForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function PartnerLoginPage() {
  const partner = await getCurrentPartner();
  if (partner) {
    redirect('/partner');
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">보험맵 파트너센터</CardTitle>
          <CardDescription>GA 관리자 계정으로 로그인하세요.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <PartnerLoginForm />
          <p className="text-center text-sm text-muted-foreground">
            아직 계정이 없으신가요?{' '}
            <Link href="/partner/signup" className="font-medium text-primary underline-offset-4 hover:underline">
              GA 등록 신청
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
