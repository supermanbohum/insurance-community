import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export interface HomeOpenBannerRow {
  id: string;
  isActive: boolean;
  headline: string;
  subtext: string;
  ctaLabel: string;
  ctaHref: string;
  updatedAt: string;
}

function toRow(row: {
  id: string;
  is_active: boolean;
  headline: string;
  subtext: string;
  cta_label: string;
  cta_href: string;
  updated_at: string;
}): HomeOpenBannerRow {
  return {
    id: row.id,
    isActive: row.is_active,
    headline: row.headline,
    subtext: row.subtext,
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
    updatedAt: row.updated_at,
  };
}

/** 관리자 화면 - 가장 최근에 만든/수정한 배너 1건(사실상 단일 설정). */
export async function getLatestHomeOpenBanner(): Promise<HomeOpenBannerRow | null> {
  const admin = createAdminClient();
  const { data } = await admin.from('home_open_banner').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data ? toRow(data) : null;
}

/** 홈 화면 - is_active인 배너만 노출. */
export async function getActiveHomeOpenBanner(): Promise<HomeOpenBannerRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('home_open_banner')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? toRow(data) : null;
}
