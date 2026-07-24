import { NextResponse } from 'next/server';
import { uploadBranchImageAction, deleteBranchMediaAction } from '@/lib/actions/branch-media-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const TEST_BRANCH_ID = '76ba5a14-3934-4853-9168-eeb50ee75366';
const TEST_GA_COMPANY_ID = 'e5a53796-71a3-4405-8d86-8f0444e19444';

// 1x1 투명 PNG
const TEST_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

/**
 * Storage 업로드→DB저장→공개URL 접근→삭제 전체 플로우를 실제 프로덕션 코드
 * (uploadBranchImageAction/deleteBranchMediaAction)로 검증하는 임시 진단 엔드포인트.
 * 브라우저 파일 피커를 자동화할 수 없어 서버 사이드에서 동일 액션을 직접 호출한다.
 */
export async function GET() {
  const steps: Record<string, unknown> = {};

  try {
    const buffer = Buffer.from(TEST_PNG_BASE64, 'base64');
    const blob = new Blob([buffer], { type: 'image/png' });
    const file = new File([blob], 'test.png', { type: 'image/png' });
    const formData = new FormData();
    formData.set('file', file);

    const uploadResult = await uploadBranchImageAction(TEST_BRANCH_ID, TEST_GA_COMPANY_ID, 'image_office', formData);
    steps.step1_upload = uploadResult;

    if (!uploadResult.success) {
      return NextResponse.json({ steps, ok: false });
    }

    const supabase = createAdminClient();
    const { data: mediaRow, error: mediaError } = await supabase
      .from('branch_media')
      .select('id, value, media_type, source')
      .eq('branch_id', TEST_BRANCH_ID)
      .eq('media_type', 'image_office')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    steps.step2_dbRow = { data: mediaRow, error: mediaError };
    if (!mediaRow) return NextResponse.json({ steps, ok: false });

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branch-images/${mediaRow.value}`;
    const fetchRes = await fetch(publicUrl, { cache: 'no-store' });
    steps.step3_publicUrlFetch = {
      url: publicUrl,
      status: fetchRes.status,
      contentType: fetchRes.headers.get('content-type'),
      contentLength: fetchRes.headers.get('content-length'),
    };

    const deleteResult = await deleteBranchMediaAction(mediaRow.id, TEST_BRANCH_ID, 'branch-images');
    steps.step4_delete = deleteResult;

    const { data: afterDelete } = await supabase.from('branch_media').select('id').eq('id', mediaRow.id).maybeSingle();
    steps.step5_dbRowAfterDelete = afterDelete;

    // storage.remove()가 실제로 지웠는지 직접 확인 (service role, RLS 우회)
    const { data: storageList, error: storageListError } = await supabase.storage.from('branch-images').list(
      `${TEST_GA_COMPANY_ID}/${TEST_BRANCH_ID}`
    );
    steps.step5b_storageObjectsRemaining = { data: storageList, error: storageListError };

    // 이전 실행에서 남은 고아 파일까지 전부 정리
    if (storageList && storageList.length > 0) {
      const prefix = `${TEST_GA_COMPANY_ID}/${TEST_BRANCH_ID}`;
      const paths = storageList.map((f) => `${prefix}/${f.name}`);
      const { error: cleanupError } = await supabase.storage.from('branch-images').remove(paths);
      steps.step5c_cleanupOrphans = { removed: paths, error: cleanupError };
    }

    const { data: storageListAfterCleanup } = await supabase.storage
      .from('branch-images')
      .list(`${TEST_GA_COMPANY_ID}/${TEST_BRANCH_ID}`);
    steps.step5d_storageObjectsAfterCleanup = storageListAfterCleanup;

    return NextResponse.json({ steps, ok: true });
  } catch (err) {
    return NextResponse.json({
      steps,
      threw: true,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  }
}
