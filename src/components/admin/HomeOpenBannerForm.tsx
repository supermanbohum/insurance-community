'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { saveHomeOpenBannerAction } from '@/lib/actions/home-banner-admin';
import type { HomeOpenBannerRow } from '@/lib/admin/home-banner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function HomeOpenBannerForm({ initial }: { initial: HomeOpenBannerRow | null }) {
  const [isPending, startTransition] = useTransition();

  const [isActive, setIsActive] = useState(initial?.isActive ?? false);
  const [headline, setHeadline] = useState(initial?.headline ?? '');
  const [subtext, setSubtext] = useState(initial?.subtext ?? '');
  const [ctaLabel, setCtaLabel] = useState(initial?.ctaLabel ?? '우리 지점 등록하기 →');
  const [ctaHref, setCtaHref] = useState(initial?.ctaHref ?? '/register');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveHomeOpenBannerAction({
        id: initial?.id ?? null,
        isActive,
        headline,
        subtext,
        ctaLabel,
        ctaHref,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('저장되었습니다. 홈에 바로 반영됩니다.');
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <p className="text-sm font-medium">배너 노출</p>
            <p className="text-xs text-muted-foreground">꺼두면 홈에 표시되지 않습니다.</p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">문구</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hb-headline">메인 문구</Label>
            <Input
              id="hb-headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="전국 4,288개 GA의 지점 등록을 받고 있습니다"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hb-subtext">보조 문구</Label>
            <Input id="hb-subtext" value={subtext} onChange={(e) => setSubtext(e.target.value)} placeholder="8월 17일 정식 오픈" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">버튼</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hb-cta-label">버튼 문구</Label>
            <Input id="hb-cta-label" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hb-cta-href">버튼 링크 (내부 경로)</Label>
            <Input id="hb-cta-href" value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} placeholder="/register" />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending} size="lg">
        {isPending ? '저장 중...' : '저장'}
      </Button>
    </form>
  );
}
