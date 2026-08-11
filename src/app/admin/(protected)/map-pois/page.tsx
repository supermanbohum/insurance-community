import { listAdminExternalPois, listSuppressedPois } from '@/lib/admin/map-external-pois';
import { SuppressPoiButton, UnsuppressPoiButton } from '@/components/admin/ExternalPoiSuppressActions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * ⑪ 지도 미등록 지점 - 표시 중단 처리 화면.
 *
 * 이 화면은 부가 기능이 아니라 정책의 실행 수단이다. 팝업이 "표시를 원하지 않으시면
 * 알려주세요 - 요청하시면 바로 내려드립니다"라고 약속하는데, 내릴 수단이 없으면
 * 첫 요청부터 운영자가 SQL을 직접 쳐야 하고 그건 지속되지 않는다. 늦어지는 순간
 * 약속이 거짓이 되고, 그 캡처가 그대로 커뮤니티에 올라간다.
 *
 * 🔴 그래서 수집을 시작하기 전에 이 화면이 있어야 한다(CTO 확정 - 데이터가 올라간
 * 뒤에 내릴 수단을 만들면 순서가 거꾸로다).
 */
export const dynamic = 'force-dynamic';

export default async function AdminMapPoisPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q?.trim() ?? '';
  const [pois, suppressed] = await Promise.all([listAdminExternalPois(query), listSuppressedPois()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">지도 미등록 지점</h1>
        <p className="text-sm text-muted-foreground">
          외부에서 수집해 지도에만 표시되는 지점입니다. 표시 중단 요청이 오면 사유를 묻지 말고 바로 처리해 주세요.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">수집된 지점 {pois.length}건</CardTitle>
          <CardDescription>상호 또는 주소로 검색합니다. 최근 수집순 100건까지 보여줍니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {/* 검색은 GET 폼으로 - 관리자 화면이라 URL에 검색어가 남아도 무방하고,
              새로고침/뒤로가기에 그대로 대응된다. */}
          <form method="get" className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="상호 또는 주소"
              className="w-full max-w-sm rounded-md border px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-md border px-3 py-2 text-sm font-medium">
              검색
            </button>
          </form>

          <div className="flex flex-col divide-y">
            {pois.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {query ? '검색 결과가 없습니다.' : '아직 수집된 지점이 없습니다.'}
              </p>
            ) : (
              pois.map((poi) => (
                <div key={poi.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{poi.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {poi.address ?? '주소 없음'} · {poi.phone ?? '공개된 연락처 없음'} · {poi.source}
                    </p>
                  </div>
                  <SuppressPoiButton source={poi.source} externalId={poi.externalId} name={poi.name} />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">표시 중단된 지점 {suppressed.length}건</CardTitle>
          <CardDescription>
            해제하면 다음 수집부터 다시 대상이 됩니다. 해제한다고 해서 즉시 지도에 다시 나타나지는 않습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0 px-6 pb-4">
          {suppressed.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">표시 중단된 지점이 없습니다.</p>
          ) : (
            suppressed.map((s) => (
              <div key={`${s.source}:${s.externalId}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {s.source} · {s.externalId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.createdAt).toLocaleString('ko-KR')}
                    {s.reason ? ` · ${s.reason}` : ''}
                  </p>
                </div>
                <UnsuppressPoiButton source={s.source} externalId={s.externalId} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
