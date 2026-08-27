import 'server-only';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * 지금 로그인한 파트너가 **관리할 수 있는** 지점 id 집합.
 *
 * 🔴 이 함수가 생긴 이유(2026-08-24): 파트너 화면은 「회사의 모든 지점」을 보여주는데
 *    저장은 `is_ga_admin_for_branch`로 지점 단위를 검사해서, 열리는데 저장만 실패하는
 *    지점이 생겼다. **화면과 저장이 같은 기준을 써야 한다.** 그 기준이 0115의
 *    `my_manageable_branch_ids()`이고, 이 함수는 그걸 그대로 가져온다.
 *
 * 0115 미적용 환경에서는 `null`을 돌려준다. 호출부는 그때 **예전 동작(회사 전체)** 을
 * 유지한다 — 마이그레이션 전에 목록이 텅 비어 아무것도 못 하게 만들지 않기 위해서다.
 */
export async function getManageableBranchIds(): Promise<Set<string> | null> {
  // 🔴 예외가 새어 나가면 파트너 화면 전체가 죽는다. null 을 돌려주면 호출부가
  //    예전 동작(회사 단위)으로 안전하게 되돌아간다 — 화면이 죽는 것보다 낫다.
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.rpc('my_manageable_branch_ids');
    if (error || !data) return null;
    return new Set(data as string[]);
  } catch {
    return null;
  }
}
