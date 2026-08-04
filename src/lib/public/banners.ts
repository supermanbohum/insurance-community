import { createPublicSupabaseClient } from '@/lib/supabase/public';
import type { BannerSlot } from '@/types/database';

export interface PublicBanner {
  id: string;
  pcImageUrl: string | null;
  mobileImageUrl: string | null;
  linkUrl: string;
}

function imageUrl(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banner-images/${path}`;
}

/** 특정 슬롯의 활성 배너 목록 - public_banners 뷰(0002)가 이미 is_active/기간을
 * 필터링해서 반환하므로 여기서는 slot만 좁히고 priority 내림차순으로 정렬한다. */
export async function listActiveBanners(slot: BannerSlot): Promise<PublicBanner[]> {
  const supabase = createPublicSupabaseClient();
  const { data } = await supabase
    .from('public_banners')
    .select('id, pc_image_path, mobile_image_path, link_url')
    .eq('slot', slot)
    .order('priority', { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    pcImageUrl: imageUrl(row.pc_image_path),
    mobileImageUrl: imageUrl(row.mobile_image_path),
    linkUrl: row.link_url,
  }));
}
