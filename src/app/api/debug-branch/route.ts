import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * 임시 진단용 엔드포인트. /branch/[slug] 404 원인 조사를 위해
 * getPublicBranchDetail()과 동일한 조건의 조회를 단계별로 실행하고
 * 각 단계의 error(code/message/details/hint)를 그대로 반환한다.
 * anon key만 사용하므로 비밀값 노출 없음. 원인 파악 후 삭제 예정.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'missing ?slug=' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const minimalSingle = await supabase.from('ga_branch').select('id, slug, status, deleted_at').eq('slug', slug).single();

  const minimalMaybeSingle = await supabase.from('ga_branch').select('id, slug, status, deleted_at').eq('slug', slug).maybeSingle();

  const fullSelect = `id, slug, name, manager_name, address, address_detail, lat, lng, intro_text, education_info, welfare_info,
       db_support_info, settlement_support_info, atmosphere_info, planner_count, parking_available, visit_consult_available,
       business_hours, operation_type, is_headquarters, updated_at, organic_view_count, imported_view_count,
       correction_view_count, is_recommended,
       ga_company:ga_company_id ( id, name, logo_path, is_verified, ceo_name, description ),
       region:region_id ( sido_name, sigungu_name )`;

  const fullSingle = await supabase.from('ga_branch').select(fullSelect).eq('slug', slug).single();
  const fullMaybeSingle = await supabase.from('ga_branch').select(fullSelect).eq('slug', slug).maybeSingle();

  const noFilterList = await supabase.from('ga_branch').select('id, slug, status, deleted_at').ilike('slug', `%${slug}%`);

  return NextResponse.json({
    queriedSlug: slug,
    queriedSlugBytes: Buffer.from(slug, 'utf-8').toString('hex'),
    minimalSingle: { data: minimalSingle.data, error: minimalSingle.error },
    minimalMaybeSingle: { data: minimalMaybeSingle.data, error: minimalMaybeSingle.error },
    fullSingle: { data: fullSingle.data, error: fullSingle.error },
    fullMaybeSingle: { data: fullMaybeSingle.data, error: fullMaybeSingle.error },
    noFilterList: {
      data: noFilterList.data,
      dataBytes: (noFilterList.data ?? []).map((r) => ({ slug: r.slug, hex: Buffer.from(r.slug, 'utf-8').toString('hex') })),
      error: noFilterList.error,
    },
  });
}
