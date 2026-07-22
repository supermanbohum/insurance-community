import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** GA(회사) 목록 페이지는 폐지됐다 - 사용자가 실제로 찾고 비교하는 단위는 지점이므로 검색으로 보낸다. */
export default function GaListRedirectPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim();
  redirect(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
}
