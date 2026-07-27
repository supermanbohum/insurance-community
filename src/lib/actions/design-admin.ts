'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Device, PageKey, SectionConfig } from '@/lib/design/sections';

export type ActionResult = { success: true } | { success: false; error: string };

function revalidateForPage(pageKey: PageKey) {
  if (pageKey === 'home') {
    revalidatePath('/');
    return;
  }
  revalidatePath('/branch/[slug]', 'page');
}

export async function saveLayoutAction(
  pageKey: PageKey,
  device: Device,
  config: SectionConfig[]
): Promise<ActionResult> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('upsert_page_layout', {
    p_page_key: pageKey,
    p_device: device,
    p_config: config as unknown as Record<string, unknown>,
  });

  if (error) {
    return { success: false, error: '저장하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  revalidatePath('/admin/design/[page]', 'page');
  revalidateForPage(pageKey);
  return { success: true };
}
