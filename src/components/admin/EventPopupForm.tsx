'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { saveEventPopupAction } from '@/lib/actions/event-popup-admin';
import type { EventPopupRow } from '@/lib/admin/event-popup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** DB의 ISO timestamptz <-> <input type="datetime-local">가 쓰는 로컬 시각 문자열 상호 변환. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function EventPopupForm({ initial }: { initial: EventPopupRow | null }) {
  const [isPending, startTransition] = useTransition();

  const [isActive, setIsActive] = useState(initial?.isActive ?? false);
  const [startAt, setStartAt] = useState(isoToLocalInput(initial?.startAt ?? null));
  const [endAt, setEndAt] = useState(isoToLocalInput(initial?.endAt ?? null));
  const [eyebrow, setEyebrow] = useState(initial?.eyebrow ?? '');
  const [headline, setHeadline] = useState(initial?.headline ?? '');
  const [offerLabel, setOfferLabel] = useState(initial?.offerLabel ?? '');
  const [oldPrice, setOldPrice] = useState(initial?.oldPrice ?? '');
  const [badge, setBadge] = useState(initial?.badge ?? '');
  const [highlight, setHighlight] = useState(initial?.highlight ?? '');
  const [highlightSuffix, setHighlightSuffix] = useState(initial?.highlightSuffix ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [featuresText, setFeaturesText] = useState(initial?.features.join(', ') ?? '');
  const [footnote, setFootnote] = useState(initial?.footnote ?? '');
  const [ctaLabel, setCtaLabel] = useState(initial?.ctaLabel ?? '지금 시작하기');
  const [ctaHref, setCtaHref] = useState(initial?.ctaHref ?? '/partner/register');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveEventPopupAction({
        id: initial?.id ?? null,
        isActive,
        startAt: localInputToIso(startAt),
        endAt: localInputToIso(endAt),
        eyebrow,
        headline,
        offerLabel,
        oldPrice,
        badge,
        highlight,
        highlightSuffix,
        description,
        features: featuresText.split(',').map((f) => f.trim()).filter(Boolean),
        footnote,
        ctaLabel,
        ctaHref,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('저장되었습니다.');
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">노출 설정</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-md border px-3.5 py-3">
            <div>
              <p className="text-sm font-medium">팝업 표시</p>
              <p className="text-xs text-muted-foreground">꺼두면 기간과 무관하게 아무에게도 뜨지 않습니다.</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ep-start">시작일시 (비우면 즉시 시작)</Label>
              <Input id="ep-start" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ep-end">종료일시 (비우면 무기한)</Label>
              <Input id="ep-end" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">문구</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ep-eyebrow">상단 작은 문구</Label>
            <Input id="ep-eyebrow" value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="🎉 보험맵 GRAND OPEN" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ep-headline">메인 문구</Label>
            <Input id="ep-headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="보험맵 전격 출시!" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ep-offer">이벤트 라벨</Label>
            <Input id="ep-offer" value={offerLabel} onChange={(e) => setOfferLabel(e.target.value)} placeholder="🎁 오픈 기념 이벤트" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ep-old-price">기존 가격 (취소선 표시)</Label>
              <Input id="ep-old-price" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="월 4,900원" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ep-badge">강조 배지</Label>
              <Input id="ep-badge" value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="선착순 100개 지점" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ep-highlight">핵심 혜택 (큰 글씨)</Label>
              <Input id="ep-highlight" value={highlight} onChange={(e) => setHighlight(e.target.value)} placeholder="6개월 무료" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ep-highlight-suffix">핵심 혜택 보조 문구</Label>
              <Input id="ep-highlight-suffix" value={highlightSuffix} onChange={(e) => setHighlightSuffix(e.target.value)} placeholder="(0원)" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ep-description">설명 (줄바꿈 그대로 반영됩니다)</Label>
            <Textarea id="ep-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ep-features">기능 태그 (쉼표로 구분)</Label>
            <Input
              id="ep-features"
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              placeholder="지점 등록, TOP설계사 등록, 실시간 채팅, 커뮤니티"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ep-footnote">하단 안내 문구</Label>
            <Textarea id="ep-footnote" value={footnote} onChange={(e) => setFootnote(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">버튼</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ep-cta-label">버튼 문구</Label>
            <Input id="ep-cta-label" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ep-cta-href">버튼 링크 (내부 경로)</Label>
            <Input id="ep-cta-href" value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} placeholder="/partner/register" />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending} size="lg">
        {isPending ? '저장 중...' : '저장'}
      </Button>
    </form>
  );
}
