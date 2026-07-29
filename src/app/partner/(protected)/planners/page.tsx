import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { requirePartner } from '@/lib/partner/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getBranchesByGaCompanyId } from '@/lib/admin/ga';
import { INCOME_TIER_SHORT_LABEL, PLANNER_STATUS_LABEL, derivePlannerDisplayStatus } from '@/lib/planners/tier';
import { RenewCertificationButton } from '@/components/partner/RenewCertificationButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlannerCertificationStatus } from '@/types/database';

const STATUS_VARIANT: Record<ReturnType<typeof derivePlannerDisplayStatus>, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending_review: 'warning',
  pending_renewal: 'warning',
  rejected: 'destructive',
  expiring_soon: 'warning',
  expired: 'destructive',
  approved: 'success',
};

export default async function PartnerPlannersPage() {
  const partner = await requirePartner();
  const branches = await getBranchesByGaCompanyId(partner.ga_company_id!);
  const approvedBranches = branches.filter((b) => b.registration_status === 'approved');
  const branchNameById = new Map(branches.map((b) => [b.id, b.name]));

  const supabase = createServerSupabaseClient();
  const { data: certifications } = await supabase
    .from('planner_certifications')
    .select('*')
    .in('branch_id', branches.map((b) => b.id))
    .order('created_at', { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">고소득 설계사</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            소속 설계사의 고소득 인증을 등록하고 관리합니다. 등급 배지만 공개되며 실제 연봉/서류는 관리자 승인용으로만 사용됩니다.
          </p>
        </div>
        {approvedBranches.length > 0 && (
          <Button asChild>
            <Link href="/partner/planners/new">
              <PlusCircle className="h-4 w-4" />
              설계사 등록
            </Link>
          </Button>
        )}
      </div>

      {approvedBranches.length === 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-4 text-sm text-amber-900">
            관리자 승인이 완료된 지점이 있어야 고소득 설계사를 등록할 수 있습니다.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">등록 목록 ({certifications?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {!certifications || certifications.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">등록된 설계사가 없습니다.</p>
          ) : (
            certifications.map((c) => {
              const displayStatus = derivePlannerDisplayStatus(c.status as PlannerCertificationStatus, c.expires_at);
              return (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {c.planner_name} · {branchNameById.get(c.branch_id) ?? '알 수 없는 지점'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {INCOME_TIER_SHORT_LABEL[c.income_tier as keyof typeof INCOME_TIER_SHORT_LABEL]} · {c.job_title}
                      {c.expires_at && ` · 만료일 ${new Date(c.expires_at).toLocaleDateString('ko-KR')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANT[displayStatus]}>{PLANNER_STATUS_LABEL[displayStatus]}</Badge>
                    {(displayStatus === 'expiring_soon' || displayStatus === 'expired') && (
                      <RenewCertificationButton certificationId={c.id} branchId={c.branch_id} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
