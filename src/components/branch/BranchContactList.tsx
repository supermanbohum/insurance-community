'use client';

import { contactHref, contactTypeIcon, contactTypeLabel } from '@/lib/branch/contact-types';
import { recordBranchContactClickAction } from '@/lib/actions/public';
import type { BranchContactItem } from '@/components/branch/types';

export function BranchContactList({
  contacts,
  variant,
}: {
  contacts: BranchContactItem[];
  variant: 'public' | 'preview';
}) {
  if (contacts.length === 0) {
    return <p className="text-sm text-ink-faint">등록된 연락처가 없습니다.</p>;
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
