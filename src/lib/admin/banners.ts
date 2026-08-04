import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { BannerSlot } from '@/types/database';

export interface AdminBannerRow {
  id: string;
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
  createdAt: string;
}

export async function listBanners(): Promise<AdminBannerRow[]> {
  const admin = createAdminClient();
  const { data } = await admin.from('banners').select('*').order('slot').order('priority', { ascending: false });
  return (data ?? []).map((row) => ({
    id: row.id,
    advertiserName: row.advertiser_name,
    campaignName: row.campaign_name,
    pcImagePath: row.pc_image_path,
    mobileImagePath: row.mobile_image_path,
    linkUrl: row.link_url,
    slot: row.slot,
    startAt: row.start_at,
    endAt: row.end_at,
    priority: row.priority,
    isActive: row.is_active,
    totalContractAmount: row.total_contract_amount,
    adminMemo: row.admin_memo,
    createdAt: row.created_at,
  }));
}

export async function getBannerById(id: string): Promise<AdminBannerRow | null> {
  const admin = createAdminClient();
  const { data } = await admin.from('banners').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    advertiserName: data.advertiser_name,
    campaignName: data.campaign_name,
    pcImagePath: data.pc_image_path,
    mobileImagePath: data.mobile_image_path,
    linkUrl: data.link_url,
    slot: data.slot,
    startAt: data.start_at,
    endAt: data.end_at,
    priority: data.priority,
    isActive: data.is_active,
    totalContractAmount: data.total_contract_amount,
    adminMemo: data.admin_memo,
    createdAt: data.created_at,
  };
}
