import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listPublicBranches } from '@/lib/public/branch';
import { BranchCard } from '@/components/branch/BranchCard';
import { EmptyBranchResults } from '@/components/branch/EmptyBranchResults';
import { Breadcrumb } from '@/components/seo/Breadcrumb';

export const dynamic = 'force-dynamic';

async function findRegion(sido: string, sigungu: string) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('regions')
    .select('id, sido_name, sigungu_name')
    .eq('sido_code', sido)
    .eq('sigungu_code', sigungu)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: { sido: string; sigungu: string };
}): Promise<Metadata> {
  const region = await findRegion(params.sido, params.sigungu);
  if (!region) return {};
  return {
    title: `${region.sido_name} ${region.sigungu_name} 보험대리점`,
    description: `${region.sido_name} ${region.sigungu_name}에 위치한 보험대리점과 GA 지점 정보를 확인하세요.`,
    alternates: { canonical: `/region/${params.sido}/${params.sigungu}` },
  };
}

export default async function RegionSigunguPage({
  params,
}: {
  params: { sido: string; sigungu: string };
}) {
  const region = await findRegion(params.sido, params.sigungu);

  if (!region) {
    notFound();
  }

  const branches = await listPublicBranches({ regionId: region.id, sort: 'recommended' });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-5">
      <Breadcrumb
        items={[
          { label: '홈', href: '/' },
          { label: '지역별 검색', href: '/region' },
          { label: region.sido_name, href: `/region/${params.sido}` },
          { label: region.sigungu_name ?? '' },
        ]}
      />
      <h1 className="text-lg font-bold text-gray-900">
        {region.sido_name} {region.sigungu_name}
      </h1>
      {branches.length === 0 ? (
        <EmptyBranchResults
          title={`${region.sido_name} ${region.sigungu_name}에 등록된 지점이 아직 없습니다`}
          secondaryAction={{ label: '지도에서 보기', href: '/map' }}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {branches.map((branch) => (
            <BranchCard key={branch.id} branch={branch} />
          ))}
        </div>
      )}
    </div>
  );
}
