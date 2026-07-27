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
        result[device] = config;
      }
    }
    return result;
  } catch {
    return fallback;
  }
}
