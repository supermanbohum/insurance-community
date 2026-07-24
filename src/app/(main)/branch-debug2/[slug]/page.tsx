import { getPublicBranchDetail } from '@/lib/public/branch';

export const dynamic = 'force-dynamic';

/**
 * notFound() 없이 branch 존재 여부만 텍스트로 출력하는 최소 재현 페이지.
 */
export default async function BranchDebug2Page({ params }: { params: { slug: string } }) {
  const branch = await getPublicBranchDetail(params.slug);
  return (
    <div style={{ padding: 24 }}>
      <p>slug param: {JSON.stringify(params.slug)}</p>
      <p>found: {String(Boolean(branch))}</p>
      <p>name: {branch?.name ?? 'null'}</p>
    </div>
  );
}
