import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { listSidoGroups } from '@/lib/public/region';

export const dynamic = 'force-dynamic';

export default async function RegionListPage() {
  const sidoList = await listSidoGroups();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-5">
      <div>
        <h1 className="text-lg font-bold text-gray-900">지역별 검색</h1>
        <p className="mt-0.5 text-sm text-gray-500">시/도를 선택하면 소속 지점을 볼 수 있어요.</p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {sidoList.map((sido) => (
          <Link
            key={sido.sidoCode}
            href={`/region/${sido.sidoCode}`}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 py-4 text-center text-sm text-gray-700 hover:border-brand-300 hover:bg-brand-50/30"
          >
            <MapPin className="h-4 w-4 text-brand-500" />
            {sido.sidoName}
          </Link>
        ))}
      </div>
    </div>
  );
}
