'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/session';
import { createAdminClient } from '@/lib/supabase/admin';

export type ActionResult = { success: true } | { success: false; error: string };

export interface EventPopupInput {
  id: string | null;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
  eyebrow: string;
  headline: string;
  offerLabel: string;
  oldPrice: string;
  badge: string;
  highlight: string;
  highlightSuffix: string;
  description: string;
  features: string[];
  footnote: string;
  ctaLabel: string;
  ctaHref: string;
}

/** 이벤트 팝업 내용/기간/on-off 저장 - id가 있으면 그 행을 갱신, 없으면 새로 만든다.
 * 실질적으로는 "지금 활성 이벤트 하나"를 편집하는 화면이라 별도의 목록 관리는 두지 않았다. */
export async function saveEventPopupAction(input: EventPopupInput): Promise<ActionResult> {
  if (!input.headline.trim()) {
    return { success: false, error: '메인 문구를 입력해주세요.' };
  }
  if (!input.ctaHref.trim().startsWith('/')) {
    return { success: false, error: '버튼 링크는 "/"로 시작하는 내부 경로여야 합니다.' };
  }

  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const payload = {
    is_active: input.isActive,
    start_at: input.startAt,
    end_at: input.endAt,
    eyebrow: input.eyebrow.trim(),
    headline: input.headline.trim(),
    offer_label: input.offerLabel.trim(),
    old_price: input.oldPrice.trim(),
    badge: input.badge.trim(),
    highlight: input.highlight.trim(),
    highlight_suffix: input.highlightSuffix.trim(),
    description: input.description,
    features: input.features.map((f) => f.trim()).filter(Boolean),
    footnote: input.footnote.trim(),
    cta_label: input.ctaLabel.trim() || '지금 시작하기',
    cta_href: input.ctaHref.trim(),
    updated_by_admin_id: admin.id,
  };

  const { error } = input.id
    ? await supabase.from('event_popups').update(payload).eq('id', input.id)
    : await supabase.from('event_popups').insert(payload);

  if (error) {
    return { success: false, error: '저장하지 못했습니다.' };
  }

  revalidatePath('/admin/event-popup');
  revalidatePath('/');
  return { success: true };
}
