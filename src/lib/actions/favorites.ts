'use server';

import { revalidatePath } from 'next/cache';
import { IS_MOCK_MODE } from '@/lib/mock/config';
import { getCurrentUser } from '@/lib/auth/session';
import { mockToggleFavorite } from '@/lib/mock/user-mutations';

export type ToggleFavoriteResult = { success: true; favorited: boolean } | { success: false; requireLogin: true };

export async function toggleFavoriteAction(gaId: string): Promise<ToggleFavoriteResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, requireLogin: true };
  }
  if (!IS_MOCK_MODE) {
    // 실제 Supabase 연결 전까지는 이 분기가 실행될 일이 없다(IS_MOCK_MODE=true 고정).
    return { success: false, requireLogin: true };
  }

  const { favorited } = mockToggleFavorite(user.id, gaId);
  revalidatePath('/my');
  revalidatePath(`/ga/${gaId}`);
  return { success: true, favorited };
}
