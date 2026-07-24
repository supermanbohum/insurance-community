import { NextResponse } from 'next/server';
import { getPublicBranchDetail, listPublicBranches } from '@/lib/public/branch';
import { getCurrentUser } from '@/lib/auth/session';
import { isBranchFavorited } from '@/lib/user/favorites';

export const dynamic = 'force-dynamic';

/**
 * /branch/[slug] 페이지와 완전히 동일한 순서/로직으로 재현해 어느 단계에서
 * 실패하는지 확인하기 위한 임시 진단 엔드포인트.
 */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const steps: Record<string, unknown> = {};
  try {
    const branch = await getPublicBranchDetail(params.slug);
    steps.step1_getPublicBranchDetail = { found: Boolean(branch), id: branch?.id ?? null };
    if (!branch) {
      return NextResponse.json({ steps, wouldCallNotFound: true });
    }

    const [user, siblings] = await Promise.all([
      getCurrentUser(),
      listPublicBranches({ gaCompanyIds: [branch.gaCompany.id] }),
    ]);
    steps.step2_getCurrentUser = user;
    steps.step3_siblings = siblings.map((s) => s.id);

    const initialFavorited = user ? await isBranchFavorited(user.id, branch.id) : false;
    steps.step4_initialFavorited = initialFavorited;

    return NextResponse.json({ steps, wouldCallNotFound: false });
  } catch (err) {
    return NextResponse.json({
      steps,
      threw: true,
      errorMessage: err instanceof Error ? err.message : String(err),
      errorStack: err instanceof Error ? err.stack : null,
    });
  }
}
