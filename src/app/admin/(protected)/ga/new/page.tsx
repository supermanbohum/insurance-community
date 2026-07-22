import { GaCreateForm } from '@/components/admin/GaCreateForm';

export default function AdminGaCreatePage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">GA 생성</h1>
        <p className="text-sm text-muted-foreground">
          배너·갤러리·SNS·상세 소개는 생성 후 상세 화면에서 추가할 수 있습니다. 새 GA는 &lsquo;심사중&rsquo; 상태로
          생성되며, 승인 후 공개됩니다.
        </p>
      </div>
      <GaCreateForm />
    </div>
  );
}
