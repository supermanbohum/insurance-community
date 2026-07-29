import { createPublicSupabaseClient } from '@/lib/supabase/public';

/** sitemap.xml 및 게시판 내비게이션 공용 - 활성 카테고리 목록. cookies()를 쓰지 않는
 * 공개 클라이언트라 sitemap.ts(별도 revalidate)에서 안전하게 호출할 수 있다. */
export async function listActiveCategorySlugs(): Promise<{ slug: string; name: string }[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from('categories')
    .select('slug, name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
