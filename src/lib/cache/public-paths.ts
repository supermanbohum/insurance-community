import { revalidatePath } from 'next/cache';

/**
 * 지점/GA의 공개 노출이 바뀌었을 때 무효화해야 하는 **공개 페이지 전부**.
 *
 * 왜 한곳에 모았나: 같은 목록이 branch-admin.ts와 ga-admin.ts에 각각 복사돼 있었고
 * **둘 다 /region 계열이 빠져 있었다.** 지역 카운트가 지점 승인/공개 토글의 영향을
 * 정확히 받는 화면인데 목록에 없었다(2026-08-13 "승인했는데 지역별에서 0으로 보인다").
 * 목록이 두 벌이면 다음에도 한쪽만 고쳐진다.
 *
 * ⚠️ 이건 **보조 장치**다. 진짜 방어는 src/lib/supabase/public.ts의 `cache: 'no-store'`이고
 * 그쪽이 Data Cache 자체를 끈다. 여기 한 줄을 빠뜨렸다고 승인이 안 보이면 안 된다 —
 * 그런 설계였다면 이미 한 번 무너진 설계다. 이 함수의 실제 값어치는
 *   ⓐ Data Cache 방침이 나중에 바뀌어도 경로 목록이 한 벌로 남는 것
 *   ⓑ 서버 액션 응답이 **처리한 관리자 본인의 클라이언트 Router Cache**를 즉시 비우는 것
 * 두 가지다. ⓑ 때문에 관리자가 승인 직후 공개 화면으로 넘어가도 옛 화면을 안 본다.
 */
export function revalidatePublicBranchPages(): void {
  revalidatePath('/');
  revalidatePath('/search');
  revalidatePath('/map');
  revalidatePath('/region');
  // 시/도·시/군/구 상세는 동적 세그먼트라 'page' 타입으로 라우트 단위 무효화한다
  // (경로마다 부르면 47·43… 전부 열거해야 하고, 하나 빠지면 그 지역만 조용히 멈춘다).
  revalidatePath('/region/[sido]', 'page');
  revalidatePath('/region/[sido]/[sigungu]', 'page');
  revalidatePath('/branch/[slug]', 'page');
}
