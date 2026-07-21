import { ArrowRight } from 'lucide-react';
import type { ChangeRequestListItem } from '@/lib/change-requests';
import { Badge, type BadgeProps } from '@/components/ui/badge';

const STATUS_LABEL: Record<ChangeRequestListItem['status'], string> = {
  pending: '검토 대기',
  approved: '승인됨',
  rejected: '반려됨',
  changes_requested: '수정 요청됨',
};

const STATUS_VARIANT: Record<ChangeRequestListItem['status'], NonNullable<BadgeProps['variant']>> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  changes_requested: 'outline',
};

/** GA/지점 변경요청 이력 목록. 파트너 대시보드·이력 페이지, 관리자 GA 상세 페이지가 공유한다. */
export function ChangeHistoryList({
  items,
  showTarget = false,
}: {
  items: ChangeRequestListItem[];
  showTarget?: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">변경 이력이 없습니다.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {new Date(item.createdAt).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
              {showTarget && <span className="text-sm font-medium">{item.targetName}</span>}
            </div>
            <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
          </div>
          <ul className="mt-2 flex flex-col gap-1">
            {item.fieldChanges.map((f) => (
              <li key={f.field} className="flex flex-wrap items-center gap-1.5 text-sm">
                <span className="font-medium">{f.label}</span>
                {f.kind === 'image' ? (
                  <span className="text-muted-foreground">{f.oldValue ? '기존 이미지' : '(없음)'} → 새 이미지로 변경</span>
                ) : f.field !== '_create' ? (
                  <>
                    <span className="text-muted-foreground">{f.oldValue}</span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span>{f.newValue}</span>
                  </>
                ) : (
                  <span>{f.newValue}</span>
                )}
              </li>
            ))}
          </ul>
          {item.status !== 'pending' && (
            <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
              처리: {item.reviewedByName ?? '알 수 없음'} ·{' '}
              {item.reviewedAt && new Date(item.reviewedAt).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })}
              {item.reviewReason && <span className="mt-0.5 block text-destructive">사유: {item.reviewReason}</span>}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
