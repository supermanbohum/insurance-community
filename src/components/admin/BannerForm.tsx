'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ImagePlus, X } from 'lucide-react';
import { saveBannerAction, uploadBannerImageAction } from '@/lib/actions/banner-admin';
import { normalizeImageFiles, HEIC_ACCEPT } from '@/lib/images/heic';
import type { AdminBannerRow } from '@/lib/admin/banners';
import type { BannerSlot } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// 🔴 라벨은 "실제로 어디에 뜨는가"로 적는다. 예전 라벨은 pc_left를 "현재 유일하게
// 실제 노출됨"이라고 했는데, pc_left 지면은 W-051로 폐지돼 지금은 아무 데도 안 뜬다.
// 그 라벨을 믿고 올리면 소재가 어디에도 안 나온다.
// 지금 화면에 연결된 지면은 mobile_list_middle 하나뿐이다(SPEC-040, 홈 「우수 GA」 위).
const SLOT_OPTIONS: { value: BannerSlot; label: string }[] = [
  { value: 'mobile_list_middle', label: '홈 · 우수 GA 위 (전 기기, 335×112 / 소재 670×224)' },
  { value: 'pc_left', label: 'PC 좌측 (지면 폐지됨 - 노출 안 됨)' },
  { value: 'pc_top', label: 'PC 상단 (미연동)' },
  { value: 'pc_right', label: 'PC 우측 (미연동)' },
  { value: 'pc_list_middle', label: 'PC 목록 중간 (미연동)' },
  { value: 'pc_detail_bottom', label: 'PC 상세 하단 (미연동)' },
  { value: 'mobile_top', label: '모바일 상단 (미연동)' },
  { value: 'mobile_detail_bottom', label: '모바일 상세 하단 (미연동)' },
  { value: 'mobile_sticky_bottom', label: '모바일 하단 고정 (미연동)' },
];

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGE_BASE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banner-images`;

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

export function BannerForm({ initial }: { initial: AdminBannerRow | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploadingPc, setIsUploadingPc] = useState(false);
  const [isUploadingMobile, setIsUploadingMobile] = useState(false);

  const [advertiserName, setAdvertiserName] = useState(initial?.advertiserName ?? '');
  const [campaignName, setCampaignName] = useState(initial?.campaignName ?? '');
  const [pcImagePath, setPcImagePath] = useState(initial?.pcImagePath ?? null);
  const [mobileImagePath, setMobileImagePath] = useState(initial?.mobileImagePath ?? null);
  const [linkUrl, setLinkUrl] = useState(initial?.linkUrl ?? '');
  const [slot, setSlot] = useState<BannerSlot>(initial?.slot ?? 'mobile_list_middle');
  const [startAt, setStartAt] = useState(isoToLocalInput(initial?.startAt ?? null));
  const [endAt, setEndAt] = useState(isoToLocalInput(initial?.endAt ?? null));
  const [priority, setPriority] = useState(String(initial?.priority ?? 0));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [totalContractAmount, setTotalContractAmount] = useState(
    initial?.totalContractAmount != null ? String(initial.totalContractAmount) : ''
  );
  const [adminMemo, setAdminMemo] = useState(initial?.adminMemo ?? '');

  const canSubmit = advertiserName.trim() && campaignName.trim() && linkUrl.trim() && startAt && endAt;

  async function pickImage(file: File | undefined, target: 'pc' | 'mobile') {
    if (!file) return;
    // 아이폰 HEIC → JPEG 변환(오너 지시 2026-08-18). 실패는 조용히 버리지 않는다.
    const { ok, failed } = await normalizeImageFiles([file]);
    if (failed.length > 0) {
      toast.error(`${failed[0].name}: ${failed[0].reason}`);
      return;
    }
    const picked = ok[0];
    if (!IMAGE_TYPES.includes(picked.type)) {
      toast.error('jpg, png, webp, 아이폰 사진(HEIC)만 업로드할 수 있습니다.');
      return;
    }
    const setUploading = target === 'pc' ? setIsUploadingPc : setIsUploadingMobile;
    setUploading(true);
    const fd = new FormData();
    fd.set('file', picked);
    const result = await uploadBannerImageAction(fd);
    setUploading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    if (target === 'pc') setPcImagePath(result.path);
    else setMobileImagePath(result.path);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveBannerAction({
        id: initial?.id ?? null,
        advertiserName,
        campaignName,
        pcImagePath,
        mobileImagePath,
        linkUrl,
        slot,
        startAt: localInputToIso(startAt) ?? '',
        endAt: localInputToIso(endAt) ?? '',
        priority: Number(priority) || 0,
        isActive,
        totalContractAmount: totalContractAmount ? Number(totalContractAmount) : null,
        adminMemo: adminMemo || null,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('저장되었습니다.');
      router.push('/admin/banners');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bn-advertiser">광고주명</Label>
              <Input id="bn-advertiser" value={advertiserName} onChange={(e) => setAdvertiserName(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bn-campaign">캠페인명</Label>
              <Input id="bn-campaign" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bn-link">연결 링크</Label>
            <Input
              id="bn-link"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://... 또는 /partner/register"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>노출 위치</Label>
            <Select value={slot} onValueChange={(v) => setSlot(v as BannerSlot)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SLOT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bn-start">노출 시작일시</Label>
              <Input id="bn-start" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bn-end">노출 종료일시</Label>
              <Input id="bn-end" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bn-priority">우선순위 (높을수록 먼저 노출)</Label>
              <Input id="bn-priority" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bn-amount">총 계약금액 (선택)</Label>
              <Input id="bn-amount" type="number" min={0} value={totalContractAmount} onChange={(e) => setTotalContractAmount(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <Label htmlFor="bn-active" className="cursor-pointer font-normal">
              활성화 (기간 내에도 이 값이 꺼져있으면 노출되지 않음)
            </Label>
            <Switch id="bn-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bn-memo">관리자 메모 (내부용)</Label>
            <Textarea id="bn-memo" value={adminMemo} onChange={(e) => setAdminMemo(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">이미지</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ImageSlot
            label="PC 이미지"
            path={pcImagePath}
            uploading={isUploadingPc}
            onPick={(file) => pickImage(file, 'pc')}
            onRemove={() => setPcImagePath(null)}
          />
          <ImageSlot
            label="모바일 이미지 (선택)"
            path={mobileImagePath}
            uploading={isUploadingMobile}
            onPick={(file) => pickImage(file, 'mobile')}
            onRemove={() => setMobileImagePath(null)}
          />
        </CardContent>
      </Card>

      <Button type="submit" size="lg" disabled={isPending || !canSubmit}>
        {isPending ? '저장 중...' : '저장'}
      </Button>
    </form>
  );
}

function ImageSlot({
  label,
  path,
  uploading,
  onPick,
  onRemove,
}: {
  label: string;
  path: string | null;
  uploading: boolean;
  onPick: (file: File | undefined) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {path ? (
        <div className="group relative aspect-[3/4] w-full max-w-[180px] overflow-hidden rounded-md border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${IMAGE_BASE_URL}/${path}`} alt={label} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
            aria-label="이미지 삭제"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label className="flex aspect-[3/4] w-full max-w-[180px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-line text-center text-xs text-muted-foreground hover:border-brand-300 hover:text-brand-600">
          <ImagePlus className="h-5 w-5" />
          {uploading ? '업로드 중...' : '이미지 선택'}
          <input
            type="file"
            accept={`${IMAGE_TYPES.join(',')},${HEIC_ACCEPT}`}
            className="hidden"
            disabled={uploading}
            onChange={(e) => onPick(e.target.files?.[0])}
          />
        </label>
      )}
    </div>
  );
}
