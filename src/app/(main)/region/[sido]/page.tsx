import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listSigunguBySido } from '@/lib/public/region';
import { listPublicBranches } from '@/lib/public/branch';
import { BranchCard } from '@/components/branch/BranchCard';

export const dynamic = 'force-dynamic';

export default async function RegionSidoPage({ params }: { params: { sido: string } }) {
  const { sidoName, items } = await listSigunguBySido(params.sido);

  if (!sidoName) {
    notFound();
  }

  // 세종처럼 시/군/구 세분이 없는 시도는 바로 지점 목록을 보여준다.
  if (items.length === 0) {
    const branches = await listPublicBranches({ sidoCode: params.sido, sort: 'recommended' });
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-5">
        <h1 className="text-lg font-bold text-gray-900">{sidoName}</h1>
        <BranchListOrEmpty branches={branches} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-5">
      <h1 className="text-lg font-bold text-gray-900">{sidoName}</h1>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.regionId}
            href={`/region/${params.sido}/${item.sigunguCode}`}
            className="flex items-center justify-center rounded-lg border border-gray-200 py-3 text-center text-sm text-gray-700 hover:border-brand-300 hover:bg-brand-50/30"
          >
            {item.sigunguName}
          </Link>
        ))}
      </div>
    </div>
  );
}

function BranchListOrEmpty({ branches }: { branches: Awaited<ReturnType<typeof listPublicBranches>> }) {
  if (branches.length === 0) {
    return <p className="py-16 text-center text-sm text-gray-400">등록된 지점이 없습니다.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {branches.map((branch) => (
        <BranchCard key={branch.id} branch={branch} />
      ))}
    </div>
  );
}
