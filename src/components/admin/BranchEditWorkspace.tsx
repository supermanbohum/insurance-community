'use client';

import { useState } from 'react';
import type { BranchContactRow, BranchMediaRow, BranchRecruitRow, BranchRow, InsurerRow, RegionRow } from '@/lib/admin/branch';
import { BranchInfoTab, type BranchInfoDraft } from '@/components/admin/BranchInfoTab';
import { BranchMediaTab } from '@/components/admin/BranchMediaTab';
import { BranchContactsTab } from '@/components/admin/BranchContactsTab';
import { BranchRecruitTab } from '@/components/admin/BranchRecruitTab';
import { BranchExposureTab } from '@/components/admin/BranchExposureTab';
import { BranchDetailView } from '@/components/branch/BranchDetailView';
import type { BranchPreviewData } from '@/components/branch/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor } from 'lucide-react';

export function BranchEditWorkspace({
  branch,
  gaCompanyName,
  isGaVerified,
  regions,
  insurers,
  media,
  contacts,
  recruits,
  insurerIds,
  imageBaseUrl,
}: {
  branch: BranchRow;
  gaCompanyName: string;
  isGaVerified: boolean;
  regions: RegionRow[];
  insurers: InsurerRow[];
  media: BranchMediaRow[];
  contacts: BranchContactRow[];
  recruits: BranchRecruitRow[];
  insurerIds: string[];
  imageBaseUrl: string;
}) {
  const [draft, setDraft] = useState<BranchInfoDraft>({
    name: branch.name,
    address: branch.address,
    addressDetail: branch.address_detail ?? '',
    introText: branch.intro_text ?? '',
    educationInfo: branch.education_info ?? '',
    welfareInfo: branch.welfare_info ?? '',
    dbSupportInfo: branch.db_support_info ?? '',
    settlementSupportInfo: branch.settlement_support_info ?? '',
  });

  const selectedInsurerNames = insurers.filter((i) => insurerIds.includes(i.id)).map((i) => i.name);

  const previewData: BranchPreviewData = {
    name: draft.name,
    address: draft.address,
    addressDetail: draft.addressDetail || null,
    lat: branch.lat,
    lng: branch.lng,
    introText: draft.introText || null,
    educationInfo: draft.educationInfo || null,
    welfareInfo: draft.welfareInfo || null,
    dbSupportInfo: draft.dbSupportInfo || null,
    settlementSupportInfo: draft.settlementSupportInfo || null,
    plannerCount: branch.planner_count,
    parkingAvailable: branch.parking_available,
    visitConsultAvailable: branch.visit_consult_available,
    businessHours: branch.business_hours,
    updatedAt: branch.updated_at,
    gaCompanyName,
    isGaVerified,
    media: media.map((m) => ({
      id: m.id,
      type: m.media_type,
      source: m.source,
      url: m.source === 'external' ? m.value : `${imageBaseUrl}/${m.value}`,
    })),
    contacts: contacts.map((c) => ({ id: c.id, type: c.type, value: c.value, label: c.label })),
    insurerNames: selectedInsurerNames,
    activeRecruits: recruits
      .filter((r) => r.is_active)
      .map((r) => ({ id: r.id, title: r.title, content: r.content, employmentType: r.employment_type })),
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
      <Tabs defaultValue="info">
        <TabsList className="flex-wrap">
          <TabsTrigger value="info">기본정보</TabsTrigger>
          <TabsTrigger value="media">미디어</TabsTrigger>
          <TabsTrigger value="contacts">연락처</TabsTrigger>
          <TabsTrigger value="recruit">채용</TabsTrigger>
          <TabsTrigger value="exposure">노출설정</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="max-w-2xl">
          <BranchInfoTab branch={branch} regions={regions} onDraftChange={setDraft} />
        </TabsContent>
        <TabsContent value="media">
          <BranchMediaTab branchId={branch.id} gaCompanyId={branch.ga_company_id} media={media} imageBaseUrl={imageBaseUrl} />
        </TabsContent>
        <TabsContent value="contacts" className="max-w-xl">
          <BranchContactsTab branchId={branch.id} contacts={contacts} />
        </TabsContent>
        <TabsContent value="recruit" className="max-w-xl">
          <BranchRecruitTab branchId={branch.id} recruits={recruits} />
        </TabsContent>
        <TabsContent value="exposure" className="max-w-xl">
          <BranchExposureTab branch={branch} insurers={insurers} initialInsurerIds={insurerIds} />
        </TabsContent>
      </Tabs>

      <div className="xl:sticky xl:top-6 xl:self-start">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Monitor className="h-3.5 w-3.5" />
          실시간 미리보기 (실제 공개 페이지와 동일한 컴포넌트)
        </div>
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto rounded-lg border bg-white p-4 shadow-sm">
          <BranchDetailView data={previewData} variant="preview" />
        </div>
      </div>
    </div>
  );
}
