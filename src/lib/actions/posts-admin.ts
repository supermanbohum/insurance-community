'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type PostActionResult = { success: true; postId: string } | { success: false; error: string };

/** 운영팀 공식 게시물 발행(W-027) - "보험맵 운영팀" 명의로 즉시 공개된다(일반 회원
 * 글과 달리 심사 대기 없음). 마크다운 원문을 그대로 저장하고, 공식 배지/하단 고지는
 * author_name_type='admin'을 보고 렌더링 시점에 붙인다(PostCard/post 상세 참고). */
export async function createOfficialPostAction(input: {
  categoryId: string;
  title: string;
  content: string;
  sourceUrl?: string;
}): Promise<PostActionResult> {
  if (!input.title.trim() || !input.content.trim()) {
    return { success: false, error: '제목과 본문을 입력해주세요.' };
  }

  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc('admin_create_post', {
    p_category_id: input.categoryId,
    p_title: input.title.trim(),
    p_content: input.content,
    p_source_url: input.sourceUrl?.trim() || undefined,
  });

  if (error || !data) {
    return { success: false, error: error?.message.includes('INVALID_CATEGORY') ? '유효하지 않은 카테고리입니다.' : '게시글을 발행하지 못했습니다.' };
  }

  revalidatePath('/admin/posts');
  revalidatePath('/community');
  revalidatePath(`/post/${data}`);

  return { success: true, postId: data as string };
}
