import Link from 'next/link';
import { BadgeCheck, Building2, Briefcase, Plus } from 'lucide-react';
import { listGaCompanies } from '@/lib/admin/ga';
import type { GaApprovalStatus } from '@/types/database';
import { APPROVAL_STATUS_BADGE_VARIANT, APPROVAL_STATUS_LABEL } from '@/lib/admin/approval-status';
import { GaApprovalActions } from '@/components/admin/GaApprovalActions';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const STATUS_TABS: { value: GaApprovalStatus | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '심사중' },
  { value: 'approved', label: '노출중' },
  { value: 'rejected', label: '반려됨' },
  { value: 'suspended', label: '중지됨' },
];

export default async function AdminGaListPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const status = STATUS_TABS.some((t) => t.value === searchParams.status)
    ? (searchParams.status as GaApprovalStatus | 'all')
    : 'all';
  const q = searchParams.q?.trim() || undefined;

  const list = await listGaCompanies({ status: status === 'all' ? undefined : status, q });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">GA 관리</h1>
          <p className="text-sm text-muted-foreground">GA를 생성하고 승인 상태를 관리합니다.</p>
        </div>
        <Link href="/admin/ga/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            GA 생성
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <Link key={tab.value} href={tab.value === 'all' ? '/admin/ga' : `/admin/ga?status=${tab.value}`}>
            <Button variant={status === tab.value ? 'default' : 'outline'} size="sm">
              {tab.label}
            </Button>
          </Link>
        ))}
        <form className="ml-auto flex items-center gap-2" action="/admin/ga">
          {status !== 'all' && <input type="hidden" name="status" value={status} />}
          <Input name="q" placeholder="GA명 또는 slug 검색" defaultValue={q} className="w-48" />
          <Button type="submit" variant="secondary" size="sm">
            검색
          </Button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GA명</TableHead>
                <TableHead>slug</TableHead>
                <TableHead>구분</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>등록일</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    조건에 맞는 GA가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                list.map((ga) => (
                  <TableRow key={ga.id}>
                    <TableCell>
                      <Link href={`/admin/ga/${ga.id}`} className="flex items-center gap-1.5 font-medium hover:underline">
                        {ga.name}
                        {ga.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{ga.slug}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {ga.is_headquarters && (
                          <Badge variant="outline" className="gap-1">
                            <Building2 className="h-3 w-3" />
                            본사
                          </Badge>
                        )}
                        {ga.is_recruiting && (
                          <Badge variant="outline" className="gap-1">
                            <Briefcase className="h-3 w-3" />
                            채용중
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={APPROVAL_STATUS_BADGE_VARIANT[ga.approval_status]}>
                        {APPROVAL_STATUS_LABEL[ga.approval_status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(ga.created_at).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <GaApprovalActions gaCompanyId={ga.id} gaName={ga.name} status={ga.approval_status} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
