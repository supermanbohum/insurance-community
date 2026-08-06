'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Phone, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { unlockPlannerContactAction } from '@/lib/actions/planner-market-credits';
import { Button } from '@/components/ui/button';
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

/** GA 파트너 전용 연락처 잠금해제 - 비로그인/일반회원이 눌러도 동작 자체는 시도되며,
 * 서버 액션의 requirePartner()가 로그인 화면으로 보낸다(다른 파트너 전용 액션과 동일 관례).
 * 이미 열람한 GA는 재클릭해도 크레딧이 다시 차감되지 않는다(get_planner_contact RPC).
 * 클릭 즉시 차감되지 않도록 확인 다이얼로그를 거치며, 열람권이 부족하면 구매 페이지로
 * 바로 이동시켜 이탈 없이 구매로 이어지게 한다. */
export function PlannerContactUnlockButton({ plannerProfileId }: { plannerProfileId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [contact, setContact] = useState<{ name: string; phone: string; email: string; kakaoId: string | null } | null>(null);

  function unlock() {
    startTransition(async () => {
      const result = await unlockPlannerContactAction(plannerProfileId);
      if (!result.success) {
        if (result.code === 'INSUFFICIENT_CREDITS') {
          toast.error(result.error);
          router.push('/planner-market/purchase');
          return;
        }
        toast.error(result.error);
        return;
      }
      setContact(result.contact);
    });
  }

  if (contact) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-brand-200 bg-brand-50 p-4">
        <p className="text-sm font-bold text-brand-700">✅ 이미 열람한 설계사입니다</p>
        <p className="text-base font-semibold">{contact.name}</p>
        <p className="flex items-center gap-1.5 text-sm text-ink-soft">
          <Phone className="h-3.5 w-3.5" /> {contact.phone}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-ink-soft">
          <Mail className="h-3.5 w-3.5" /> {contact.email}
        </p>
        {contact.kakaoId && (
          <p className="flex items-center gap-1.5 text-sm text-ink-soft">
            <MessageCircle className="h-3.5 w-3.5" /> {contact.kakaoId}
          </p>
        )}
      </div>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" size="lg" disabled={isPending} className="w-full gap-2">
          <Lock className="h-4 w-4" />
          {isPending ? '확인 중...' : '연락처 보기 (열람권 1건 사용)'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>정말 열람하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>열람권 1장을 사용합니다.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={unlock}>확인</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
