'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff, ShieldOff, UserX } from 'lucide-react';
import {
  setPlannerProfileHiddenAction,
  withdrawPlannerProfileAction,
  revokePlannerContactSharingAction,
} from '@/lib/actions/planner-market';
import { PlannerBadgeList } from '@/components/planner-market/PlannerBadgeList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PlannerBadgeSummary } from '@/types/database';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending_review: 'warning',
  approved: 'success',
  rejected: 'destructive',
};

const STATUS_LABEL: Record<string, string> = {
  pending_review: '심사 대기중',
  approved: '승인됨 (공개중)',
  rejected: '반려됨',
};

export interface MyPlannerProfileSummary {
  id: string;
  name: string;
  status: 'pending_review' | 'approved' | 'rejected';
  isHidden: boolean;
  contactSharingRevoked: boolean;
  reviewReason: string | null;
  badges: PlannerBadgeSummary[];
}

export function PlannerMyProfileCard({ profile }: { profile: MyPlannerProfileSummary }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggleHidden() {
    startTransition(async () => {
      const result = await setPlannerProfileHiddenAction(profile.id, !profile.isHidden);
      if (result.success) {
        toast.success(profile.isHidden ? '다시 공개되었습니다.' : '비공개로 전환되었습니다.');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function revokeContact() {
    startTransition(async () => {
      const result = await revokePlannerContactSharingAction(profile.id);
      if (result.success) {
        toast.success('개인정보 제공이 철회되었습니다.');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function withdraw() {
    startTransition(async () => {
      const result = await withdrawPlannerProfileAction(profile.id);
      if (result.success) {
        toast.success('등록이 해지되었습니다.');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">{profile.name}</h2>
          <Badge variant={STATUS_VARIANT[profile.status]}>{STATUS_LABEL[profile.status]}</Badge>
          {profile.isHidden && <Badge variant="outline">비공개</Badge>}
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/planner-market/edit">정보 수정</Link>
        </Button>
      </div>

      {profile.badges.length > 0 && <PlannerBadgeList badges={profile.badges} />}

      {profile.status === 'rejected' && profile.reviewReason && (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">반려 사유: {profile.reviewReason}</p>
      )}

      {profile.contactSharingRevoked && (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">개인정보 제공을 철회한 상태입니다. GA가 연락처를 새로 열람할 수 없습니다.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={toggleHidden} className="gap-1.5">
          {profile.isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {profile.isHidden ? '다시 공개하기' : '프로필 비공개'}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" size="sm" variant="outline" disabled={isPending || profile.contactSharingRevoked} className="gap-1.5">
              <ShieldOff className="h-3.5 w-3.5" />
              개인정보 제공 철회
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>개인정보 제공을 철회할까요?</AlertDialogTitle>
              <AlertDialogDescription>철회 즉시 어떤 GA도 연락처를 새로 열람할 수 없습니다. 이미 열람한 GA도 다음부터 볼 수 없습니다.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={revokeContact}>철회하기</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" size="sm" variant="destructive" disabled={isPending} className="gap-1.5">
              <UserX className="h-3.5 w-3.5" />
              등록 해지
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>설계사 등록을 해지할까요?</AlertDialogTitle>
              <AlertDialogDescription>즉시 비공개 처리되며 &quot;설계사 찾기&quot;에서 사라집니다. 이후 다시 등록할 수 있습니다.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={withdraw}>해지하기</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
