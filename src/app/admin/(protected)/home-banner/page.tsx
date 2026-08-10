import { getLatestHomeOpenBanner } from '@/lib/admin/home-banner';
import { HomeOpenBannerForm } from '@/components/admin/HomeOpenBannerForm';

export default async function AdminHomeBannerPage() {
  const initial = await getLatestHomeOpenBanner();

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">홈 오픈 배너</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          홈 화면 상단의 오픈 카운트다운 배너 문구를 관리합니다. 재배포 없이 바로 반영됩니다. 정식 오픈일이 정해지면 이 화면에서
          문구만 바꾸면 됩니다.
        </p>
      </div>
      <HomeOpenBannerForm initial={initial} />
    </div>
  );
}
