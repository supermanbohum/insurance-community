import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * 로그인 여부와 무관한 공개 조회 전용 클라이언트. cookies()를 전혀 건드리지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 왜 `cache: 'no-store'`를 강제하나 — "승인했는데 방문자에게 안 보인다" (2026-08-13)
 * ─────────────────────────────────────────────────────────────────────────────
 * 증상: 승인·공개(visible) 상태인 지점이 /region에서 0으로 세어졌다. 기기·브라우저·
 * 로그인 무관이고 값이 흔들렸다("새로고침 한 번 하면 돌아온다").
 *
 * 원인은 **Next의 Data Cache**다. `export const dynamic = 'force-dynamic'`은
 * **렌더링만** 동적으로 만들 뿐 fetch 캐시를 끄지 않는다. Next 14.2.15 소스로 확인:
 *   - create-component-tree.js:109  force-dynamic → `staticGenerationStore.forceDynamic = true`
 *     (여기서 `fetchCache`도 `revalidate`도 건드리지 않는다)
 *   - patch-fetch.js:320            `autoNoCache = (authorization|cookie 헤더 있음) && store.revalidate === 0`
 *                                   → force-dynamic은 revalidate를 0으로 만들지 않으므로 **false**
 *   - patch-fetch.js:365-367        어디에도 안 걸리면 `cacheReason = "auto cache"`,
 *                                   `revalidate = false` (= **무기한 캐시**)
 *   - patch-fetch.js:387-389        `revalidate === false` → isCacheableRevalidate → 캐시에 저장
 * 즉 supabase-js가 보내는 GET이 **전부 무기한 Data Cache에 들어간다.**
 * (supabase-js는 `Authorization: Bearer <anon key>`를 붙이지만, 위 320행 조건이
 *  `store.revalidate === 0`을 함께 요구하기 때문에 그 헤더만으로는 캐시를 못 막는다.)
 *
 * 페이지 응답 헤더가 `no-store` + `x-vercel-cache: MISS`였던 것과 모순되지 않는다 —
 * 그건 **CDN** 캐시고, 여기서 문제가 된 것은 **서버 안쪽의 Data Cache**다.
 * 값이 흔들린 이유도 이것으로 설명된다: 캐시 엔트리를 가진 인스턴스/리전에 걸리면
 * 승인 전 스냅샷이, 그렇지 않으면 실데이터가 나온다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 짧은 revalidate가 아니라 no-store인가 (판단 근거)
 * ─────────────────────────────────────────────────────────────────────────────
 * 기준은 하나 — **"승인했는데 안 보인다"가 다시 나오면 안 된다.**
 *   ⓐ 짧은 revalidate(예: 10초)도 그만큼 "승인했는데 안 보이는 창"을 남긴다.
 *      지점 승인은 하루 몇 건이고, 그 몇 건이 안 보이는 것이 지금 실제 사고다.
 *   ⓑ 태그/경로 단위 정밀 revalidate는 **관리자 쓰기 경로를 하나도 빠뜨리지 않아야**
 *      성립한다. 하나 놓치면 증상이 조용히 돌아오고, 놓쳤다는 사실이 화면에 안 드러난다.
 *      (revalidatePath는 보조로 남겨 뒀다 — src/lib/cache/public-paths.ts)
 *   ⓒ 비용이 거의 없다. 이 클라이언트를 쓰는 공개 페이지(홈·검색·지도·지역·지점상세)는
 *      **이미 전부 force-dynamic**이라 요청마다 어차피 다시 렌더링된다. Data Cache가
 *      아껴 주던 것은 DB 왕복 한 번뿐이고, 애초에 기대했던 ISR 이점은 지금 존재하지 않는다.
 *
 * ⚠️ 부작용을 알고 받아들인다: `revalidate = 3600`인 /sitemap.xml·/rss.xml은 내부 fetch가
 * no-store가 되면서 요청마다 동적 생성된다(patch-fetch.js:382). 크롤러가 하루 몇 번
 * 부르는 경로라 DB 부하보다 **최신성이 낫다**고 판단했다.
 *
 * ⚠️ 개인화된 조회(조회수 기록, 관리자/파트너 세션 필요한 조회)에는 여전히 쓰지 않는다.
 */
export function createPublicSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        // 🔴 이 한 줄이 위에서 설명한 Data Cache를 끈다. 지우면 "승인했는데 안 보인다"가
        // 그대로 돌아온다. patch-fetch.js:303 → curRevalidate = 0 → 캐시에 저장하지 않는다.
        fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
      },
    }
  );
}
