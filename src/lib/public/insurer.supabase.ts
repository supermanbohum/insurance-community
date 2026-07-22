import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function countActiveInsurers(): Promise<number> {
  const supabase = createServerSupabaseClient();
  const { count, error } = await supabase.from('insurers').select('id', { count: 'exact', head: true }).eq('is_active', true);
  if (error) throw error;
  return count ?? 0;
}
