'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { setBannerActiveAction } from '@/lib/actions/banner-admin';
import { Switch } from '@/components/ui/switch';

export function BannerActiveToggle({ bannerId, isActive }: { bannerId: string; isActive: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle(next: boolean) {
    startTransition(async () => {
      const result = await setBannerActiveAction(bannerId, next);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return <Switch checked={isActive} onCheckedChange={toggle} disabled={isPending} />;
}
