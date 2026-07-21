import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listPublicBranches } from '@/lib/public/branch';
import { BranchCard } from '@/components/branch/BranchCard';

export const dynamic = 'force-dynamic';

export default async function RegionSigunguPage({
  params,
}: {
  params: { sido: string; sigungu: string };
}) {
  const supabase = createServerSupabaseClient();
  const { data: region } = await supabase
    .from('regions')
    .select('id, sido_name, sigungu_name')
    .eq('sido_code', params.sido)
    .eq('sigungu_code', params.sigungu)
    .maybeSingle();

  if (!region) {
    notFound();
  }

  const branches = await listPublicBranches({ regionId: region.id, sort: 'recommended' });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-5">
      <h1 className="text-lg font-bold text-gray-900">
        {region.sido_name} {region.sigungu_name}
      </h1>
      {branches.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-400">등록된 지점이 없습니다.</p>
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
