import { listMyBranchInquiries } from '@/lib/partner/branch-inquiries';
import { BranchInquiryList } from '@/components/admin/BranchInquiryList';

/** W-059 - 파트너가 자기 GA 소속 지점들이 받은 문의를 확인하는 화면. */
export default async function PartnerInquiriesPage() {
  const inquiries = await listMyBranchInquiries();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">받은 문의</h1>
        <p className="text-sm text-muted-foreground">우리 지점에 접수된 비로그인 문의 목록입니다.</p>
      </div>
      <BranchInquiryList inquiries={inquiries} />
    </div>
  );
}
