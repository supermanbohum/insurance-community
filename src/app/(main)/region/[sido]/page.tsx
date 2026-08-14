import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listSigunguBySido, listSigunguGroups } from '@/lib/public/region';
import { listPublicBranches } from '@/lib/public/branch';
import { BranchCard } from '@/components/branch/BranchCard';
import { EmptyBranchResults } from '@/components/branch/EmptyBranchResults';
import { Breadcrumb } from '@/components/seo/Breadcrumb';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { sido: string } }): Promise<Metadata> {
  const { sidoName } = await listSigunguBySido(params.sido);
  if (!sidoName) return {};
  return {
    title: `${sidoName} 보험대리점 찾기`,
    description: `${sidoName} 지역의 보험대리점과 GA 지점 정보를 한눈에 확인하세요.`,
    alternates: { canonical: `/region/${params.sido}` },
  };
}

export default async function RegionSidoPage({ params }: { params: { sido: string } }) {
  // 🔴 listSigunguBySido가 아니라 listSigunguGroups다 - 지점 수가 함께 온다. 카운트 기준은
  // 상위 /region(listSidoGroups)과 **같은 함수**를 재사용하므로 시/도 합계와 어긋나지 않는다.
  const { sidoName, items } = await listSigunguGroups(params.sido);

  if (!sidoName) {
    notFound();
  }

  const breadcrumbItems = [{ label: '홈', href: '/' }, { label: '지역별 검색', href: '/region' }, { label: sidoName }];

  // 세종처럼 시/군/구 세분이 없는 시도는 바로 지점 목록을 보여준다.
  if (items.length === 0) {
    const branches = await listPublicBranches({ sidoCode: params.sido, sort: 'recommended' });
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-5">
        <Breadcrumb items={breadcrumbItems} />
        <h1 className="text-lg font-bold text-gray-900">{sidoName}</h1>
        <BranchListOrEmpty branches={branches} sidoName={sidoName} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-5">
      <Breadcrumb items={breadcrumbItems} />
      <h1 className="text-lg font-bold text-gray-900">{sidoName}</h1>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((item) => (
          // 🔴 0개 시군구도 목적지는 그대로 시군구 상세다(/register로 보내지 않는다).
          // 상위 /region은 0인 시/도에 숫자를 아예 안 보여주고 "1호 지점 등록"으로 바꿔
          // /register로 보내지만(W-056), 여기는 오너 지시가 「0도 그대로 표기」다 - 숫자를
          // 보여주기로 한 이상 그 숫자를 누르면 등록 폼이 튀어나오는 건 예상 밖의 이동이다.
          // 시군구 상세는 이미 EmptyBranchResults(0건 공용 컴포넌트)로 "아직 없습니다 +
          // 1호 자리가 비어 있습니다"와 CTA를 보여주므로, 막다른 길이 아니다.
          <Link
            key={item.regionId}
            href={`/region/${params.sido}/${item.sigunguCode}`}
            className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-gray-200 py-3 text-center text-sm text-gray-700 hover:border-brand-300 hover:bg-brand-50/30"
          >
            {item.sigunguName}
            <span
              className={
                item.branchCount > 0
                  ? 'text-xs font-semibold text-brand-600'
                  : 'text-xs font-medium text-gray-400'
              }
            >
              {item.branchCount}개 지점
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function BranchListOrEmpty({
  branches,
  sidoName,
}: {
  branches: Awaited<ReturnType<typeof listPublicBranches>>;
  sidoName: string;
}) {
  if (branches.length === 0) {
    return (
      <EmptyBranchResults
        icon="pin"
        title={`${sidoName}에 등록된 지점이 아직 없습니다`}
        description={`보험맵은 지금 전국에서 지점 등록을 받고 있습니다. ${sidoName} 1호 자리가 비어 있습니다.`}
        secondaryAction={{ label: '지도에서 보기', href: '/map' }}
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {branches.map((branch) => (
        <BranchCard key={branch.id} branch={branch} />
      ))}
    </div>
  );
}
