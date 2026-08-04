'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { BannerSlot } from '@/types/database';

export type ActionResult = { success: true } | { success: false; error: string };
export type UploadResult = { success: true; path: string } | { success: false; error: string };

const IMAGE_BUCKET = 'banner-images';
const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface BannerInput {
  id: string | null;
  advertiserName: string;
  campaignName: string;
  pcImagePath: string | null;
  mobileImagePath: string | null;
  linkUrl: string;
  slot: BannerSlot;
  startAt: string;
  endAt: string;
  priority: number;
  isActive: boolean;
  totalContractAmount: number | null;
  adminMemo: string | null;
}

/** 배너 이미지 업로드 - 스토리지 insert 정책 자체가 관리자만 허용하므로(0040) 세션
 * 클라이언트로도 충분하다. 저장 폼이 먼저 이걸로 경로를 받아온 뒤 saveBannerAction에
 * pcImagePath/mobileImagePath로 전달한다. */
export async function uploadBannerImageAction(formData: FormData): Promise<UploadResult> {
  await requireAdmin();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: '이미지 파일을 선택해주세요.' };
  }
  const extension = IMAGE_MIME_EXTENSIONS[file.type];
  if (!extension) {
    return { success: false, error: 'jpg, png, webp 형식만 업로드할 수 있습니다.' };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: '이미지는 최대 5MB까지 업로드할 수 있습니다.' };
  }

  const supabase = createServerSupabaseClient();
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, await file.arrayBuffer(), {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    return { success: false, error: '업로드하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }
  return { success: true, path };
}

/** 배너 생성/수정 - id가 있으면 갱신, 없으면 새로 만든다. banners 테이블은 공개
 * select 정책만 있고(뷰 경유) 쓰기 정책이 없어 관리자 클라이언트로만 쓸 수 있다. */
export async function saveBannerAction(input: BannerInput): Promise<ActionResult> {
  if (!input.advertiserName.trim() || !input.campaignName.trim()) {
    return { success: false, error: '광고주명과 캠페인명을 입력해주세요.' };
  }
  if (!input.linkUrl.trim()) {
    return { success: false, error: '연결 링크를 입력해주세요.' };
  }
  if (!input.startAt || !input.endAt) {
    return { success: false, error: '노출 시작/종료 일시를 입력해주세요.' };
  }
  if (new Date(input.endAt) <= new Date(input.startAt)) {
    return { success: false, error: '종료 일시는 시작 일시보다 이후여야 합니다.' };
  }

  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const payload = {
    advertiser_name: input.advertiserName.trim(),
    campaign_name: input.campaignName.trim(),
    pc_image_path: input.pcImagePath,
    mobile_image_path: input.mobileImagePath,
    link_url: input.linkUrl.trim(),
    slot: input.slot,
    start_at: input.startAt,
    end_at: input.endAt,
    priority: input.priority,
    is_active: input.isActive,
    total_contract_amount: input.totalContractAmount,
    admin_memo: input.adminMemo?.trim() || null,
  };

  const { error } = input.id
    ? await supabase.from('banners').update(payload).eq('id', input.id)
    : await supabase.from('banners').insert({ ...payload, created_by_admin_id: admin.id });

  if (error) {
    return { success: false, error: '저장하지 못했습니다.' };
  }

  revalidatePath('/admin/banners');
  revalidatePath('/');
  return { success: true };
}

/** 배너 삭제 - 이미지도 스토리지에서 함께 정리한다. */
export async function deleteBannerAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: banner } = await admin.from('banners').select('pc_image_path, mobile_image_path').eq('id', id).maybeSingle();

  const { error } = await admin.from('banners').delete().eq('id', id);
  if (error) {
    return { success: false, error: '삭제하지 못했습니다.' };
  }

  const paths = [banner?.pc_image_path, banner?.mobile_image_path].filter((p): p is string => Boolean(p));
  if (paths.length > 0) {
    const { error: removeError } = await admin.storage.from(IMAGE_BUCKET).remove(paths);
    if (removeError) {
      console.error('[deleteBannerAction] storage.remove failed', removeError);
    }
  }

  revalidatePath('/admin/banners');
  revalidatePath('/');
  return { success: true };
}

/** 노출 on/off 빠른 토글. */
export async function setBannerActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('banners').update({ is_active: isActive }).eq('id', id);
  if (error) {
    return { success: false, error: '변경하지 못했습니다.' };
  }
  revalidatePath('/admin/banners');
  revalidatePath('/');
  return { success: true };
}
