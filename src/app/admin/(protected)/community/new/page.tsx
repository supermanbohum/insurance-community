import { listAdminCategories } from '@/lib/admin/community';
import { OfficialPostForm } from '@/components/admin/OfficialPostForm';

export default async function AdminOfficialPostNewPage() {
  const categories = await listAdminCategories();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">운영팀 공식 글 발행</h1>
        <p className="text-sm text-muted-foreground">&ldquo;보험맵 운영팀&rdquo; 명의로 즉시 공개됩니다(W-027).</p>
      </div>
      <OfficialPostForm categories={categories} />
    </div>
  );
}
