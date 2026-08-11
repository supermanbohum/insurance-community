import Link from 'next/link';
import { listBanners } from '@/lib/admin/banners';
import { BannerActiveToggle } from '@/components/admin/BannerActiveToggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SLOT_LABEL: Record<string, string> = {
  pc_top: 'PC 상단',
  pc_left: 'PC 좌측(폐지)',
  pc_right: 'PC 우측',
  pc_list_middle: 'PC 목록 중간',
  pc_detail_bottom: 'PC 상세 하단',
  mobile_top: '모바일 상단',
  mobile_list_middle: '홈 · 우수 GA 위',
  mobile_detail_bottom: '모바일 상세 하단',
  mobile_sticky_bottom: '모바일 하단 고정',
};

/** 광고 배너 관리 - 실제로 화면에 연동된 지면은 홈 「🏅 우수 GA」 위 하나뿐이다
 * (slot=mobile_list_middle, SPEC-040). 나머지 슬롯은 값만 저장되고 노출 로직이 없다.
 * 🔴 pc_left(PC 좌측)는 예전에 연동돼 있었으나 W-051로 지면 자체가 폐지됐다 -
 * 여기에 올려도 아무 데도 안 뜬다. */
export default async function AdminBannersPage() {
  const banners = await listBanners();
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">광고 배너 관리</h1>
          <p className="text-sm text-muted-foreground">
            실제 노출되는 지면은 <strong>홈 · 우수 GA 위</strong> 하나입니다. 소재 670×224(표시 335×112),
            게재 기간 안이고 활성 상태인 배너 중 우선순위가 가장 높은 1건만 뜹니다. 소재가 없으면 지면 자체가 그려지지 않습니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/banners/new">배너 등록</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{banners.length}건</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {banners.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">등록된 배너가 없습니다.</p>
          ) : (
            banners.map((banner) => {
              const isLive = banner.isActive && new Date(banner.startAt) <= now && now <= new Date(banner.endAt);
              return (
                <div key={banner.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 text-sm hover:bg-accent">
                  <Link href={`/admin/banners/${banner.id}`} className="min-w-0 flex-1">
                    <p className="font-medium">
                      {banner.advertiserName} · {banner.campaignName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {SLOT_LABEL[banner.slot] ?? banner.slot} · 우선순위 {banner.priority} ·{' '}
                      {new Date(banner.startAt).toLocaleDateString('ko-KR')} ~ {new Date(banner.endAt).toLocaleDateString('ko-KR')}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge variant={isLive ? 'success' : 'outline'}>{isLive ? '노출중' : banner.isActive ? '기간외' : '비활성'}</Badge>
                    <BannerActiveToggle bannerId={banner.id} isActive={banner.isActive} />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
