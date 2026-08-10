'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/session';
import { createAdminClient } from '@/lib/supabase/admin';

export type ActionResult = { success: true } | { success: false; error: string };

export interface HomeOpenBannerInput {
  id: string | null;
  isActive: boolean;
  headline: string;
  subtext: string;
  ctaLabel: string;
  ctaHref: string;
}

/** 홈 오픈 배너 저장 - id가 있으면 갱신, 없으면 새로 만든다. 정식 오픈 전환처럼
 * 재배포 없이 즉시 반영되어야 하는 문구라 event_popups와 동일 패턴을 쓴다. */
export async function saveHomeOpenBannerAction(input: HomeOpenBannerInput): Promise<ActionResult> {
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
    headline: input.headline.trim(),
    subtext: input.subtext.trim(),
    cta_label: input.ctaLabel.trim() || '우리 지점 등록하기 →',
    cta_href: input.ctaHref.trim(),
    updated_by_admin_id: admin.id,
  };

  const { error } = input.id
    ? await supabase.from('home_open_banner').update(payload).eq('id', input.id)
    : await supabase.from('home_open_banner').insert(payload);

  if (error) {
    return { success: false, error: '저장하지 못했습니다.' };
  }

  revalidatePath('/admin/home-banner');
  revalidatePath('/');
  return { success: true };
}
