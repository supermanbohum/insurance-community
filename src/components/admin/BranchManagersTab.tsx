'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2, UserPlus } from 'lucide-react';
import {
  grantBranchManagerAction,
  revokeBranchManagerAction,
  type BranchManager,
} from '@/lib/actions/branch-managers-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * 지점 매니저 — 계정이 달라도 이 지점을 관리하게 해준다.
 *
 * 🔴 이 화면이 생긴 이유(2026-08-24): 한 담당자가 여러 사무실을 맡는데
 *    계정이 지점 하나에만 묶여 있어서, 다른 사무실은 **폼은 열리는데 저장만 실패**했다.
 *    사람이 바뀔 때마다 SQL을 치는 건 해결이 아니라서 화면으로 만들었다.
 */
export function BranchManagersTab({
  branchId,
  branchName,
  managers,
}: {
  branchId: string;
  branchName: string;
  managers: BranchManager[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');

  function add() {
    startTransition(async () => {
      const result = await grantBranchManagerAction(branchId, email);
      if (result.success) {
        toast.success('매니저로 등록했습니다.');
        setEmail('');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function remove(gaAdminUserId: string) {
    startTransition(async () => {
      const result = await revokeBranchManagerAction(branchId, gaAdminUserId);
      if (result.success) {
        toast.success('해제했습니다.');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">지점 매니저 추가</CardTitle>
          <CardDescription>
            여기 등록된 계정은 <b>{branchName}</b>의 사진·연락처·채용정보를 직접 수정하고 승인 요청을 보낼 수 있습니다.
            지점장 본인 계정은 따로 등록하지 않아도 됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="manager-email">보험맵 가입 이메일</Label>
            <div className="flex gap-2">
              <Input
                id="manager-email"
                type="email"
                value={email}
                placeholder="manager@example.com"
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && email.trim() && !isPending) add();
                }}
              />
              <Button onClick={add} disabled={isPending || !email.trim()}>
                <UserPlus className="mr-1.5 h-4 w-4" />
                등록
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            🔴 그 사람이 <b>먼저 보험맵에 회원가입</b>되어 있어야 합니다. 가입 안 된 이메일은 등록되지 않습니다 —
            주인 없는 관리 권한을 만들지 않기 위해서입니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">등록된 매니저 ({managers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {managers.length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 없습니다.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {managers.map((m) => (
                <li key={m.gaAdminUserId} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.displayName ?? '이름 없음'} · {new Date(m.createdAt).toLocaleDateString('ko-KR')} 등록
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => remove(m.gaAdminUserId)}
                    aria-label={`${m.email} 매니저 해제`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
