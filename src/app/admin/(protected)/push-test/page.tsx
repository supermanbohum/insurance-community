import { AdminPushTestForm } from '@/components/admin/AdminPushTestForm';

/** 관리자 본인 기기로만 보내는 테스트 발송 - 실제 문의 폼으로 파이프라인을 검증하면
 * 실지점 담당자에게 가짜 리드가 간다(CTO 지적). W-040 검증용으로 신설. */
export default function AdminPushTestPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">푸시 테스트 발송</h1>
        <p className="text-sm text-muted-foreground">
          내 계정에 등록된 기기로만 보냅니다. 조용한 시간대(21시~08시) 제약을 받지 않습니다.
        </p>
      </div>
      <AdminPushTestForm />
    </div>
  );
}
