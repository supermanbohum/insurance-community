import { NextResponse } from 'next/server';
import { getPublicBranchDetail } from '@/lib/public/branch';

export const dynamic = 'force-dynamic';

/**
 * /branch/[slug]와 동일한 라우트 세그먼트 구조로 params.slug 값 자체를 점검하기 위한 임시 진단 엔드포인트.
 * getPublicBranchDetail()을 params.slug로 그대로 호출해 실제 페이지와 동일한 조건을 재현한다.
 */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const branch = await getPublicBranchDetail(params.slug);
  return NextResponse.json({
    rawParamsSlug: params.slug,
    rawParamsSlugBytes: Buffer.from(params.slug, 'utf-8').toString('hex'),
    branchFound: Boolean(branch),
    branchId: branch?.id ?? null,
  });
}
