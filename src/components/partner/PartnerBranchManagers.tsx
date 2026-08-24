'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2, UserPlus } from 'lucide-react';
import {
  addMyBranchManagerAction,
  removeMyBranchManagerAction,
  type PartnerBranchManager,
} from '@/lib/actions/branch-managers-partner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * 지점 관리자가 직접 매니저를 추가/해제한다. **운영진 승인 없이 즉시 적용된다.**
 *
 * 🔴 이 화면이 생긴 이유(오너 2026-08-24): 운영자 화면만 있으면 사람이 바뀔 때마다
 *    운영팀을 거쳐야 하고, 지점이 늘수록 병목이 된다. 「컴패니언만 해결하면 뭔 의미냐」.
 */
export function PartnerBranchManagers({
  branchId,
  branchName,
  managers,
}: {
  branchId: string;
  branchName: string;
  managers: PartnerBranchManager[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');

  function add() {
    startTransition(async () => {
      const result = await addMyBranchManagerAction(branchId, email);
      if (result.success) {
        toast.success('바로 등록됐습니다. 지금부터 이 지점을 관리할 수 있습니다.');
        setEmail('');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function remove(gaAdminUserId: string, label: string) {
    startTransition(async () => {
      const result = await removeMyBranchManagerAction(branchId, gaAdminUserId);
      if (result.success) {
        toast.success(`${label} 님의 관리 권한을 해제했습니다.`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">함께 관리할 사람 추가</CardTitle>
        <CardDescription>
          여기 추가한 계정은 <b>{branchName}</b>의 사진·연락처·채용정보를 직접 수정하고 승인 요청을 보낼 수 있습니다.
          <b> 운영팀 승인을 기다릴 필요 없이 바로 적용됩니다.</b>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="partner-manager-email">보험맵 가입 이메일</Label>
          <div className="flex gap-2">
            <Input
              id="partner-manager-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              value={email}
              placeholder="manager@example.com"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && email.trim() && !isPending) add();
              }}
            />
            <Button onClick={add} disabled={isPending || !email.trim()}>
              <UserPlus className="mr-1.5 h-4 w-4" />
              추가
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            그분이 <b>먼저 보험맵에 회원가입</b>되어 있어야 합니다. 가입 안 된 이메일은 등록되지 않습니다.
          </p>
        </div>

        <div className="border-t pt-3">
          <p className="mb-2 text-sm font-medium">함께 관리 중 ({managers.length})</p>
          {managers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 없습니다. 지점을 같이 관리할 분의 이메일을 추가해보세요.
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {managers.map((m) => (
                <li key={m.gaAdminUserId} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString('ko-KR')} 추가
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => remove(m.gaAdminUserId, m.email)}
                    aria-label={`${m.email} 관리 권한 해제`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
