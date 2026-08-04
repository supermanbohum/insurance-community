import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/session';
import { BannerForm } from '@/components/admin/BannerForm';

export default async function AdminNewBannerPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/banners" className="hover:underline">
            광고 배너 관리
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">배너 등록</h1>
      </div>
      <BannerForm initial={null} />
    </div>
  );
}
