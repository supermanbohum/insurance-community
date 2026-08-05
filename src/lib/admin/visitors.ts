import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export interface TodayVisitorBreakdown {
  realCount: number;
  adjustment: number;
  displayCount: number;
}

/** 방문자수 관리자 보정 화면 전용 - 실제 방문자/보정값/최종 표시값 3분할. */
export async function getTodayVisitorBreakdown(): Promise<TodayVisitorBreakdown> {
  const supabase = createAdminClient();
  const { data } = await supabase.rpc('get_today_visitor_breakdown');
  const row = data?.[0];
  return {
    realCount: row?.real_count ?? 0,
    adjustment: row?.adjustment ?? 0,
    displayCount: row?.display_count ?? 0,
  };
}
