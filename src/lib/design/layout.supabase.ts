import 'server-only';
import { createPublicSupabaseClient } from '@/lib/supabase/public';
import { DEVICES, getDefaultConfig, type Device, type PageKey, type SectionConfig } from '@/lib/design/sections';

export type DeviceConfigMap = Record<Device, SectionConfig[]>;

function fallbackConfig(pageKey: PageKey): DeviceConfigMap {
  return {
    mobile: getDefaultConfig(pageKey),
    tablet: getDefaultConfig(pageKey),
    desktop: getDefaultConfig(pageKey),
  };
}

/**
 * 옛 키를 새 키로 풀어 준다 - 저장된 레이아웃을 고아로 만들지 않기 위한 읽기 시점 이행.
 *
 * 🔴 'hero'(등록 CTA + 통계 묶음)는 2026-08-14에 'heroCta' + 'heroStats'로 쪼개졌다.
 * page_layouts에 hero로 저장된 행이 있으면 그 설정(visible/locked/margin/text)이
 * 두 키에 물려져야 한다 - 이 매핑이 없으면 관리자가 저장해 둔 hero 설정은 키를 쪼갠
 * 순간 어떤 화면에도 적용되지 않는 유령 데이터가 된다.
 *
 * 배치 원칙: 두 키가 hero의 order를 **같이** 물려받는다(동률이면 DOM 순서 = CTA 먼저).
 * hero는 한 덩어리였으므로 그 사이에 다른 섹션이 있을 수 없고, 이것이 정확한 보존이다.
 * marginBottom은 CTA가 12(분리 전 내부 gap-3), 통계가 hero의 값(덩어리 뒤 간격)을 가져간다.
 * text(ctaLabel)는 CTA 쪽에만 의미가 있다.
 *
 * ⚠️ 지금(2026-08-14) page_layouts는 비어 있어 이 경로를 타는 데이터가 없다 - 그래도
 * 넣어 두는 이유는, 백업 복원이나 편집기 저장이 언제 hero 시절 데이터를 되살릴지
 * 알 수 없기 때문이다. 저장 포맷을 바꿀 때 읽기 호환을 같이 넣지 않아서 무너진 사고를
 * 이 저장소는 이미 여러 번 겪었다(schema_migrations 0084 단절 등).
 */
function expandLegacyKeys(pageKey: PageKey, stored: SectionConfig[]): SectionConfig[] {
  if (pageKey !== 'home') return stored;
  const hero = stored.find((s) => s.key === 'hero');
  if (!hero) return stored;

  const alreadySplit = stored.some((s) => s.key === 'heroCta' || s.key === 'heroStats');
  const rest = stored.filter((s) => s.key !== 'hero');
  if (alreadySplit) return rest; // 새 키가 있으면 그쪽이 정본이다 - 옛 행만 걷어낸다.

  return [
    { ...hero, key: 'heroCta', marginBottom: 12 },
    { ...hero, key: 'heroStats', marginTop: 0, text: undefined },
    ...rest,
  ];
}

/** 저장된 설정에 있는 섹션 키는 그 값을 쓰고, 매니페스트(sections.ts)에는 있지만
 * 저장된 값에는 없는 키(신규 추가된 섹션 등)는 기본값으로 채운다 - 편집 UI에서
 * 저장한 뒤에 섹션 구성 자체가 바뀌어도(추가/삭제) 페이지가 깨지지 않는다. */
function mergeWithDefaults(pageKey: PageKey, stored: SectionConfig[]): SectionConfig[] {
  const byKey = new Map(expandLegacyKeys(pageKey, stored).map((s) => [s.key, s]));
  return getDefaultConfig(pageKey).map((def, index) => byKey.get(def.key) ?? { ...def, order: index });
}

/** 저장된 설정이 없거나(0020 미실행 포함) 조회에 실패하면 기본값으로 폴백한다 -
 * 이 페이지가 마이그레이션 적용 전에 배포되어도 지금과 동일하게 보여야 하기 때문. */
export async function getPageLayoutConfig(pageKey: PageKey): Promise<DeviceConfigMap> {
  const fallback = fallbackConfig(pageKey);
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from('page_layouts')
      .select('device, config')
      .eq('page_key', pageKey);
    if (error) throw error;

    const result = { ...fallback };
    for (const row of data ?? []) {
      const device = row.device as Device;
      const config = row.config as unknown as SectionConfig[];
      if (DEVICES.includes(device) && Array.isArray(config) && config.length > 0) {
        result[device] = mergeWithDefaults(pageKey, config);
      }
    }
    return result;
  } catch {
    return fallback;
  }
}
