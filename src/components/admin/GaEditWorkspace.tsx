'use client';

import type { GaCompanyRow } from '@/lib/admin/ga';
import { GaInfoTab } from '@/components/admin/GaInfoTab';
import { GaExposureTab } from '@/components/admin/GaExposureTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * GA는 이제 회사 정보/로고/브랜드 소개만 갖는 상위 엔티티라 실제 공개 상세페이지가 없다 -
 * 그래서 Branch 편집 화면과 달리 실시간 미리보기 패널 없이 폼만 제공한다.
 * 실제 공개 상세페이지는 지점(Branch) 편집 화면(BranchEditWorkspace)에만 존재한다.
 */
export function GaEditWorkspace({ ga }: { ga: GaCompanyRow }) {
  return (
    <Tabs defaultValue="info" className="max-w-2xl">
      <TabsList>
        <TabsTrigger value="info">기본정보</TabsTrigger>
        <TabsTrigger value="exposure">노출설정</TabsTrigger>
      </TabsList>
      <TabsContent value="info">
        <GaInfoTab ga={ga} />
      </TabsContent>
      <TabsContent value="exposure" className="max-w-xl">
        <GaExposureTab ga={ga} />
      </TabsContent>
    </Tabs>
  );
}
