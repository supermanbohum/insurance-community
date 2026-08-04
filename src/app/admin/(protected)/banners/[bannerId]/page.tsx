import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBannerById } from '@/lib/admin/banners';
import { BannerForm } from '@/components/admin/BannerForm';
import { DeleteBannerButton } from '@/components/admin/DeleteBannerButton';

export default async function AdminEditBannerPage({ params }: { params: { bannerId: string } }) {
  const banner = await getBannerById(params.bannerId);
  if (!banner) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/admin/banners" className="hover:underline">
              광고 배너 관리
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {banner.advertiserName} · {banner.campaignName}
          </h1>
        </div>
        <DeleteBannerButton bannerId={banner.id} />
      </div>
      <BannerForm initial={banner} />
    </div>
  );
}
