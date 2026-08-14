'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import {
  setBranchInsurersAction,
  setBranchRecommendedAction,
  setBranchProAction,
  setBranchStatusAction,
  getBranchDeleteImpactAction,
  deleteBranchAction,
  type BranchDeleteImpact,
} from '@/lib/actions/branch-admin';
import type { BranchRow, InsurerRow } from '@/lib/admin/branch';
import { InsurerMultiSelect } from '@/components/admin/InsurerMultiSelect';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export function BranchExposureTab({
  branch,
  insurers,
  initialInsurerIds,
}: {
  branch: BranchRow;
  insurers: InsurerRow[];
  initialInsurerIds: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [insurerIds, setInsurerIds] = useState(initialInsurerIds);
  const [deleteImpact, setDeleteImpact] = useState<BranchDeleteImpact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // <input type="date">가 요구하는 YYYY-MM-DD로 잘라 넣는다(저장 시 그 날의 끝으로 보정).
  const [proUntilDate, setProUntilDate] = useState(branch.pro_until ? branch.pro_until.slice(0, 10) : '');
  const [confirmHideOpen, setConfirmHideOpen] = useState(false);

  function handleSavePro() {
    // 만료일을 "그 날까지 유효"로 읽히게 하루의 끝(23:59:59.999)으로 맞춘다 - 날짜만
    // 받으면 자정이 되어 사용자가 고른 당일에 이미 꺼진 것처럼 보인다.
    const until = new Date(`${proUntilDate}T23:59:59.999`).toISOString();
    startTransition(async () => {
      const result = await setBranchProAction(branch.id, until);
      if (result.success) toast.success('PRO 뱃지를 적용했습니다.');
      else toast.error(result.error);
    });
  }

  function handleClearPro() {
    startTransition(async () => {
      const result = await setBranchProAction(branch.id, null);
      if (result.success) {
        setProUntilDate('');
        toast.success('PRO 뱃지를 해제했습니다.');
      } else toast.error(result.error);
    });
  }

  function applyStatus(checked: boolean) {
    startTransition(async () => {
      const result = await setBranchStatusAction(branch.id, checked ? 'visible' : 'hidden');
      if (result.success) toast.success(checked ? '공개로 전환했습니다.' : '비공개로 전환했습니다.');
      else toast.error(result.error);
    });
  }

  function handleStatusToggle(checked: boolean) {
    // 🔴 켜는 것은 되돌리기 쉽지만, 끄는 것은 **승인된 실지점을 토글 한 번으로 사이트에서
    // 지우는 일**이다(지역 카운트·검색·지도·상세 전부에서 사라진다). 확인 단계를 둔다.
    // 이 스위치와 바로 아래 「추천 지점」 스위치가 나란히 있고 둘 다 「노출」로 읽혀서
    // 오너가 실제로 한 시간을 잃었다 - 무게가 다른 두 스위치를 같은 무게로 두지 않는다.
    if (!checked) {
      setConfirmHideOpen(true);
      return;
    }
    applyStatus(true);
  }

  function handleRecommendedToggle(checked: boolean) {
    startTransition(async () => {
      const result = await setBranchRecommendedAction(branch.id, checked);
      if (result.success) {
        toast.success(
          checked
            ? '목록 상단 고정을 켰습니다. 광고 심사를 처리하면 자동으로 해제될 수 있습니다.'
            : '목록 상단 고정을 껐습니다.'
        );
      }
      else toast.error(result.error);
    });
  }

  function handleSaveInsurers() {
    startTransition(async () => {
      const result = await setBranchInsurersAction(branch.id, insurerIds);
      if (result.success) toast.success('취급 원수사를 저장했습니다.');
      else toast.error(result.error);
    });
  }

  async function handleOpenDeleteDialog(open: boolean) {
    if (open && !deleteImpact) {
      const impact = await getBranchDeleteImpactAction(branch.id);
      setDeleteImpact(impact);
    }
  }

  function handleDelete() {
    setIsDeleting(true);
    startTransition(async () => {
      const result = await deleteBranchAction(branch.id);
      setIsDeleting(false);
      if (result.success) {
        toast.success('지점이 삭제되었습니다.');
        router.push('/admin/branches');
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 🔴 아래 두 스위치는 예전에 나란히 놓여 **둘 다 「노출」로 읽혔다.** 오너가 이 둘을
          구분하지 못해 한 시간을 잃었다. 이름을 「사이트 공개」/「목록 상단 고정」으로 갈라 놓고,
          각각 **무엇이 실제로 달라지는지**를 설명에 그대로 적는다. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">사이트 공개 (끄면 방문자에게 사라집니다)</CardTitle>
          <CardDescription>
            끄면 이 지점이 <b>홈·검색·지도·지역별 목록·지역별 지점 수·지점 상세페이지에서 통째로
            빠집니다.</b> 링크를 알고 있어도 상세페이지가 열리지 않습니다. GA가 승인 상태여도
            이 지점만 숨기는 스위치이고, 아래 「목록 상단 고정」과 달리{' '}
            <b>노출 자체를 없애는</b> 설정입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Switch checked={branch.status === 'visible'} onCheckedChange={handleStatusToggle} disabled={isPending} />
          <span className="text-sm">{branch.status === 'visible' ? '공개' : '비공개(방문자에게 안 보임)'}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">목록 상단 고정 (「추천」 배지)</CardTitle>
          {/* 🔴 예전 문구는 「홈 화면의 추천 GA 섹션에 노출됩니다」였는데 **사실이 아니다.**
              그런 섹션은 없다. 실제 효과는 아래 두 가지뿐이다(코드 확인:
              정렬 = src/lib/public/branch.supabase.ts:231, 배지 = BranchCard.tsx:71). */}
          <CardDescription>
            <span className="flex flex-col gap-1.5">
              <span>켜면 이 두 가지가 달라집니다. 그 외에는 아무 변화도 없습니다.</span>
              <span>① 검색·지도·지역별·홈 목록의 <b>기본 정렬에서 맨 위로</b> 올라갑니다.</span>
              <span>② 지점 카드에 <b>「추천」 배지</b>가 붙습니다.</span>
              <span className="text-muted-foreground">
                (홈에 「추천 GA 섹션」 같은 별도 영역은 없습니다. `recommended_rank`는 저장되지만
                지금 어느 화면에서도 쓰이지 않습니다.)
              </span>
              <span className="font-semibold text-destructive">
                🔴 여기서 수동으로 켠 추천은 <b>광고 심사(승인·반려)를 처리하는 순간 자동으로
                해제됩니다.</b> 심사 시 `sync_branch_ad_exposure`가 돌면서 &ldquo;승인+결제완료+기간내&rdquo;
                광고가 없는 지점의 추천을 전부 끕니다. 결제 없이 켜 둔 추천은 그때 사라지므로,
                광고 심사를 한 뒤에는 이 스위치를 다시 확인해주세요.
              </span>
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Switch checked={branch.is_recommended} onCheckedChange={handleRecommendedToggle} disabled={isPending} />
          <span className="text-sm">{branch.is_recommended ? '상단 고정중' : '미지정'}</span>
        </CardContent>
      </Card>

      <AlertDialog open={confirmHideOpen} onOpenChange={setConfirmHideOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>&quot;{branch.name}&quot;을 방문자에게서 숨기시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2">
                <span>
                  비공개로 바꾸면 홈·검색·지도·지역별 목록·지역별 지점 수·지점 상세페이지에서
                  <b> 통째로 빠집니다.</b> 링크를 알고 있어도 상세페이지가 열리지 않습니다.
                </span>
                <span className="text-xs text-muted-foreground">
                  데이터는 지워지지 않고, 다시 켜면 그대로 돌아옵니다. 「목록 상단 고정(추천)」과
                  헷갈리기 쉬운 자리라 한 번 더 묻습니다.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setConfirmHideOpen(false);
                applyStatus(false);
              }}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              비공개로 전환
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ⑧ PRO 뱃지(SPEC-035 v2) - 결제 연동 없이 운영팀이 직접 기간을 넣는다.
          🔴 정렬·랭킹·검색 순서에는 전혀 영향이 없다(오너 확정 "상위 노출 차별 없음") -
          지점명 우측에 표기만 된다. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">PRO 뱃지</CardTitle>
          <CardDescription>
            지점명 우측에 PRO 태그가 표시됩니다. 검색·랭킹 순서에는 영향을 주지 않습니다. 만료일이 지나면 안내 없이 자동으로
            사라집니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">만료일</span>
            <input
              type="date"
              value={proUntilDate}
              onChange={(e) => setProUntilDate(e.target.value)}
              className="rounded-md border px-2 py-1.5 text-sm"
            />
            <Button onClick={handleSavePro} disabled={isPending || !proUntilDate} size="sm">
              적용
            </Button>
            {branch.pro_until && (
              <Button onClick={handleClearPro} disabled={isPending} size="sm" variant="outline">
                해제
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            현재 상태:{' '}
            {branch.pro_until && new Date(branch.pro_until).getTime() > Date.now() ? (
              <span className="font-semibold text-foreground">
                PRO 표시중 (~{new Date(branch.pro_until).toLocaleDateString('ko-KR')})
              </span>
            ) : (
              '미표시'
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">취급 원수사</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <InsurerMultiSelect insurers={insurers} selectedIds={insurerIds} onChange={setInsurerIds} />
          <Button onClick={handleSaveInsurers} disabled={isPending} className="self-start">
            {isPending ? '저장 중...' : '취급 원수사 저장'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">지점 삭제</CardTitle>
          <CardDescription>
            삭제하면 홈/검색/지도/상세페이지를 포함한 모든 공개 화면과 관리자 목록에서 즉시 사라집니다. 되돌리려면
            데이터베이스에서 직접 복구해야 합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog onOpenChange={handleOpenDeleteDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                지점 삭제
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>&quot;{branch.name}&quot; 지점을 삭제하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="flex flex-col gap-2">
                    <span>이 작업은 즉시 적용되며, 공개 사이트와 관리자 목록에서 더 이상 보이지 않습니다.</span>
                    {deleteImpact ? (
                      <span className="rounded-md bg-muted px-3 py-2 text-xs text-foreground">
                        연관 데이터: 사진/영상 {deleteImpact.mediaCount}개, 연락처 {deleteImpact.contactsCount}개, 진행중
                        채용공고 {deleteImpact.activeRecruitCount}건, 누적 조회수 {deleteImpact.viewCount}회
                        <br />
                        이 데이터는 삭제되지 않고 보관되지만, 지점이 비공개 처리되며 함께 노출이 중단됩니다.
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">연관 데이터를 확인하는 중...</span>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete();
                  }}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? '삭제 중...' : '삭제'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
