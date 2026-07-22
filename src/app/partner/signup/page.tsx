import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentPartner } from '@/lib/partner/session';
import { PartnerSignupForm } from '@/components/partner/PartnerSignupForm';
import { PartnerStepIndicator } from '@/components/partner/PartnerStepIndicator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function PartnerSignupPage() {
  const partner = await getCurrentPartner();
  if (partner) {
    redirect('/partner');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="w-full max-w-sm">
        <PartnerStepIndicator status="signup" />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">GA 등록 신청</CardTitle>
          <CardDescription>계정을 만들고 GA/지점 정보를 등록하면 보험맵 관리자 승인 후 공개됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <PartnerSignupForm />
          <p className="text-center text-sm text-muted-foreground">
            이미 계정이 있으신가요?{' '}
            <Link href="/partner/login" className="font-medium text-primary underline-offset-4 hover:underline">
              로그인
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
