'use client';

import { useState, useTransition } from 'react';
import { Phone, MessageSquare, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { markBranchInquiryReadAction } from '@/lib/actions/branch-inquiry-admin';

export interface BranchInquiryListItem {
  id: string;
  branchName: string;
  gaCompanyName?: string;
  inquirerName: string;
  contactType: string;
  contactValue: string;
  career: string | null;
  message: string;
  readAt: string | null;
  createdAt: string;
}

/** W-059 - 관리자/파트너 공용 "받은 문의" 목록. 두 화면이 데이터 조회만 다르고
 * (admin_list_branch_inquiries / list_my_branch_inquiries) UI는 동일해서
 * 컴포넌트를 공유한다. */
export function BranchInquiryList({ inquiries }: { inquiries: BranchInquiryListItem[] }) {
  const [items, setItems] = useState(inquiries);
  const [isPending, startTransition] = useTransition();

  function handleMarkRead(id: string) {
    startTransition(async () => {
      const result = await markBranchInquiryReadAction(id);
      if (result.success) {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, readAt: new Date().toISOString() } : i)));
      }
    });
  }

  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">접수된 문의가 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        문의자의 연락처는 문의 응대 목적으로만 사용할 수 있습니다.
      </p>
      {items.map((inquiry) => (
        <div
          key={inquiry.id}
          className={`flex flex-col gap-2 rounded-xl border p-4 ${inquiry.readAt ? 'border-border bg-background' : 'border-primary/40 bg-primary/5'}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {inquiry.branchName}
              {inquiry.gaCompanyName && <span className="text-xs font-normal text-muted-foreground">({inquiry.gaCompanyName})</span>}
              {!inquiry.readAt && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">NEW</span>}
            </div>
            <span className="text-xs text-muted-foreground">{new Date(inquiry.createdAt).toLocaleString('ko-KR')}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-medium">{inquiry.inquirerName}</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              {inquiry.contactType === 'phone' ? <Phone className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
              {inquiry.contactValue}
            </span>
            {inquiry.career && <span className="text-muted-foreground">경력 {inquiry.career}</span>}
          </div>

          <p className="text-sm leading-relaxed text-foreground">{inquiry.message}</p>

          {!inquiry.readAt && (
            <Button size="sm" variant="outline" className="w-fit gap-1.5" disabled={isPending} onClick={() => handleMarkRead(inquiry.id)}>
              <CheckCheck className="h-3.5 w-3.5" />
              읽음으로 표시
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
