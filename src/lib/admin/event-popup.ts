import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export interface EventPopupRow {
  id: string;
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
  updatedAt: string;
}

function toRow(row: {
  id: string;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  eyebrow: string;
  headline: string;
  offer_label: string;
  old_price: string;
  badge: string;
  highlight: string;
  highlight_suffix: string;
  description: string;
  features: string[];
  footnote: string;
  cta_label: string;
  cta_href: string;
  updated_at: string;
}): EventPopupRow {
  return {
    id: row.id,
    isActive: row.is_active,
    startAt: row.start_at,
    endAt: row.end_at,
    eyebrow: row.eyebrow,
    headline: row.headline,
    offerLabel: row.offer_label,
    oldPrice: row.old_price,
    badge: row.badge,
    highlight: row.highlight,
    highlightSuffix: row.highlight_suffix,
    description: row.description,
    features: row.features,
    footnote: row.footnote,
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
    updatedAt: row.updated_at,
  };
}

/** 관리자 화면 - 가장 최근에 만든/수정한 이벤트 팝업 1건(사실상 단일 설정으로 다룬다). */
export async function getLatestEventPopup(): Promise<EventPopupRow | null> {
  const admin = createAdminClient();
  const { data } = await admin.from('event_popups').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data ? toRow(data) : null;
}

/** 공개 화면(Root Layout) - 지금 시점에 실제로 노출돼야 하는 활성 팝업 1건. */
export async function getActiveEventPopup(): Promise<EventPopupRow | null> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data } = await admin
    .from('event_popups')
    .select('*')
    .eq('is_active', true)
    .or(`start_at.is.null,start_at.lte.${nowIso}`)
    .or(`end_at.is.null,end_at.gte.${nowIso}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? toRow(data) : null;
}
