import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = createServerSupabaseClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, slug, name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900">전체글</h1>

      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
        <p>
          익명 세션 상태:{' '}
          <span className="font-medium text-brand-600">
            {session ? '연결됨 (익명 사용자)' : '세션 생성 중...'}
          </span>
        </p>
        {error && (
          <p className="mt-1 text-red-600">
            카테고리 조회 오류: {error.message} — Supabase 환경변수와 SQL 마이그레이션 적용 여부를 확인하세요.
          </p>
        )}
      </div>

      <ul className="mt-4 flex gap-2">
        {categories?.map((c) => (
          <li
            key={c.id}
            className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700"
          >
            {c.name}
          </li>
        ))}
      </ul>

      <div className="mt-10 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
        게시글 목록/작성/댓글/추천 기능은 Phase 2~3에서 구현됩니다.
        <br />
        지금은 익명 인증 + DB 연결 + 레이아웃(Phase 1)이 정상 동작하는지 확인하는 화면입니다.
      </div>
    </div>
  );
}
