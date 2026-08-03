import { getLatestEventPopup } from '@/lib/admin/event-popup';
import { EventPopupForm } from '@/components/admin/EventPopupForm';

export default async function AdminEventPopupPage() {
  const initial = await getLatestEventPopup();

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">이벤트 팝업</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          사이트 최초 방문자에게 뜨는 출시 이벤트 팝업의 노출 여부/기간/문구를 관리합니다. 재배포 없이 바로 반영됩니다.
        </p>
      </div>
      <EventPopupForm initial={initial} />
    </div>
  );
}
