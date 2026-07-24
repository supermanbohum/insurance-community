import { notFound } from 'next/navigation';
import { getPublicBranchDetail, recordBranchView, listPublicBranches } from '@/lib/public/branch';
import { getCurrentUser } from '@/lib/auth/session';
import { isBranchFavorited } from '@/lib/user/favorites';

export const dynamic = 'force-dynamic';

/**
 * /branch/[slug]와 완전히 동일한 코드를 다른 세그먼트 이름으로 배치해
 * "페이지로서" 렌더링될 때만 재현되는지 확인하기 위한 임시 진단 페이지.
 */
export default async function BranchDebugPage({ params }: { params: { slug: string } }) {
  const branch = await getPublicBranchDetail(params.slug);
  if (!branch) {
    notFound();
  }

  await recordBranchView(branch.id);

  const [user, siblings] = await Promise.all([
    getCurrentUser(),
    listPublicBranches({ gaCompanyIds: [branch.gaCompany.id] }),
  ]);
  const initialFavorited = user ? await isBranchFavorited(user.id, branch.id) : false;

  return (
    <div style={{ padding: 24 }}>
      <p>OK: {branch.name}</p>
      <p>slug param: {params.slug}</p>
      <p>siblings: {siblings.length}</p>
      <p>favorited: {String(initialFavorited)}</p>
    </div>
  );
}
