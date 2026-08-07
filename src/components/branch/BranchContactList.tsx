'use client';

import Link from 'next/link';
import { MessageCircle, Megaphone } from 'lucide-react';
import { contactHref, contactTypeIcon, contactTypeLabel } from '@/lib/branch/contact-types';
import { recordBranchContactClickAction } from '@/lib/actions/public';
import { BranchInquiryForm } from '@/components/branch/BranchInquiryForm';
import type { BranchContactItem } from '@/components/branch/types';

export function BranchContactList({
  contacts,
  variant,
  inquiry,
}: {
  contacts: BranchContactItem[];
  variant: 'public' | 'preview';
  /** 공개 페이지에서만 넘겨준다(W-059) - 등록된 연락처가 없을 때 비로그인 문의 폼을 보여준다. */
  inquiry?: { branchId: string; branchName: string };
}) {
  if (contacts.length === 0) {
    // 연락처가 없으면 막다른 길이 되지 않도록 대체 문의 경로를 제시한다(W-003).
    if (variant === 'public' && inquiry) {
      return (
        <div className="flex flex-col gap-3">
          <BranchInquiryForm branchId={inquiry.branchId} branchName={inquiry.branchName} />
          {/* 채팅은 문의 폼으로 대체하지 않는다 - 실시간/비동기로 공존한다(W-059). */}
          <Link
            href="/chat"
            className="flex items-center justify-center gap-1.5 rounded-full border border-line bg-white px-4 py-2.5 text-xs font-bold text-ink-soft transition-colors hover:border-brand-200 hover:text-brand-600"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            실시간 채팅으로 문의하기
          </Link>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-surface-sunken py-6 text-center">
        <p className="text-sm font-semibold text-ink">이 지점에 관심이 있으신가요?</p>
        <p className="text-xs text-ink-faint">등록된 연락처가 없어 아래 방법으로 문의하실 수 있습니다.</p>
        {variant === 'public' ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/chat"
              className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              실시간 채팅 문의
            </Link>
            <Link
              href="/contact"
              className="flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-xs font-bold text-ink-soft transition-colors hover:border-brand-200 hover:text-brand-600"
            >
              <Megaphone className="h-3.5 w-3.5" />
              정보 제보
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {contacts.map((contact) => {
        const Icon = contactTypeIcon(contact.type);
        const label = contact.label || contactTypeLabel(contact.type);
        const content = (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold text-ink">{label}</span>
              <span className="block truncate text-xs text-ink-faint">{contact.value}</span>
            </span>
          </>
        );

        if (variant === 'preview') {
          return (
            <li
              key={contact.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5"
            >
              {content}
            </li>
          );
        }

        return (
          <li key={contact.id}>
            <a
              href={contactHref(contact.type, contact.value)}
              target={contact.type === 'phone' || contact.type === 'phone_recruit' ? undefined : '_blank'}
              rel="noreferrer"
              onClick={() => {
                void recordBranchContactClickAction(contact.id);
              }}
              className="flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5 transition-colors hover:border-brand-200 hover:bg-brand-50/40"
            >
              {content}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
