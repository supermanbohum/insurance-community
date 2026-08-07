import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { listSidoGroups } from '@/lib/public/region';
import { Breadcrumb } from '@/components/seo/Breadcrumb';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '지역별 보험대리점 찾기',
  description: '시/도, 시/군/구별로 전국 보험대리점과 GA 지점을 찾아보세요.',
  alternates: { canonical: '/region' },
};

export default async function RegionListPage() {
  const sidoList = await listSidoGroups();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-5">
      <Breadcrumb items={[{ label: '홈', href: '/' }, { label: '지역별 검색' }]} />
      <div>
        <h1 className="text-lg font-bold text-gray-900">지역별 검색</h1>
        <p className="mt-0.5 text-sm text-gray-500">시/도를 선택하면 소속 지점을 볼 수 있어요.</p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {sidoList.map((sido) =>
          sido.branchCount > 0 ? (
            <Link
              key={sido.sidoCode}
              href={`/region/${sido.sidoCode}`}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 py-4 text-center text-sm text-gray-700 hover:border-brand-300 hover:bg-brand-50/30"
            >
              <MapPin className="h-4 w-4 text-brand-500" />
              {sido.sidoName}
              <span className="text-xs font-semibold text-brand-600">{sido.branchCount}개 지점</span>
            </Link>
          ) : (
            // 지점이 하나도 없는 시/도는 빈 목록으로 보내는 대신(W-056) "0"을 보여주지 않고
            // 바로 등록 CTA로 전환한다 - 목적지가 비어 있는 링크는 사용자에게 막다른 길이다.
            <Link
              key={sido.sidoCode}
              href="/partner/register"
              className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-brand-200 bg-brand-50/40 py-4 text-center text-sm text-ink-soft hover:bg-brand-50"
            >
              <MapPin className="h-4 w-4 text-brand-400" />
              {sido.sidoName}
              <span className="text-[11px] font-bold text-brand-600">1호 지점 등록</span>
            </Link>
          )
        )}
      </div>
    </div>
  );
}
