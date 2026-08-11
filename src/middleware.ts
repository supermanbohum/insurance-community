import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * 모든 요청에서 실행된다.
 * - 세션이 없으면 Supabase Anonymous Auth로 백그라운드 익명 세션을 생성한다.
 * - 사용자는 로그인/회원가입 화면을 전혀 보지 않는다.
 * - /admin 경로는 이 미들웨어에서 익명 세션을 강제하지 않는다 (관리자는 이메일/비밀번호 로그인 사용).
 *
 * 🔴 봇에는 익명 세션을 발급하지 않는다 (2026-08-11).
 * 그 전까지는 세션 없는 모든 요청에 발급했는데, 봇은 쿠키를 물고 있지 않아
 * **요청 하나하나가 신규 계정 발급 시도**가 됐다. 그 결과 Supabase 인증
 * rate limit이 상시 포화됐고, 실사용자가 그 한도를 봇과 나눠 쓰다 밀려났다.
 *
 * 인증 로그 실측(독립 표본 2개, 각 약 4분):
 *   POST /signup 75건 → 성공 15 (20%) / 429 over_request_rate_limit 60
 *   POST /signup 76건 → 성공 14 (18%) / 429 over_request_rate_limit 62
 * 즉 방문자 5명 중 4명이 세션을 못 받고 있었다 - 세션이 없으면 글·댓글·채팅이
 * 안 되고 record_site_visit도 안 남아 방문자 지표까지 실제보다 적게 잡힌다.
 *
 * 누적 결과: auth.users 22,454건 중 21,943건(97.8%)이 익명이고, 그중
 * 15,900건은 방문·글·댓글 흔적이 하나도 없다. 익명 사용자도 Supabase MAU에
 * 포함되므로 요금·한도에 직접 영향이 있다.
 *
 * ⚠️ 이건 완충 장치이지 근본 해결이 아니다. UA를 위조하는 봇은 그대로 통과한다.
 * 근본 해결은 "둘러보기에는 세션을 만들지 않고 글쓰기·채팅 시점에 만든다"인데,
 * 그러면 방문자 집계 기준 자체가 바뀌므로 오너 확인이 필요하다(CTO에 보고함).
 */

// 자기 정체를 밝히는 크롤러/프리뷰 봇. 이들은 글도 댓글도 채팅도 하지 않으므로
// 세션이 아예 필요 없다. 🔴 목록에 없는 봇은 그대로 세션을 받는다 - 사람을
// 막는 것보다 봇을 놓치는 쪽이 안전한 방향이라 일부러 좁게 잡았다.
// 🔴 한국 크롤러는 이름에 bot/crawler가 안 들어가서 일반 패턴으로는 안 걸린다.
// 네이버=Yeti, 다음=daumoa 또는 "compatible; Daum/", 카카오 공유 미리보기=kakaotalk-scrap.
// ⚠️ 여기서 실사용자 UA와 겹치면 사람이 세션을 못 받는다. 실제로 겹칠 뻔한 것들:
//   - 카카오톡 인앱 브라우저 UA에는 "KAKAOTALK"이 들어간다 → `kakaotalk`으로 잡으면 안 되고
//     크롤러 전용인 `kakaotalk-scrap`으로만 잡는다.
//   - 네이버 앱 인앱 브라우저 UA에는 "NAVER(inapp; ...)"가 들어간다 → `naver`로 잡으면 안 되고
//     크롤러 이름인 `yeti`로만 잡는다.
//   - 다음 앱도 같은 이유로 `daum` 단독이 아니라 `daumoa` / `compatible; daum/`으로만 잡는다.
// 아래 목록은 UA 실물로 검증했다(bot/사람 13종 대조).
const BOT_UA =
  /bot|crawler|spider|crawling|slurp|archiver|yeti|daumoa|compatible;\s*daum\/|kakaotalk-scrap|facebookexternalhit|embedly|quora link preview|whatsapp|telegram|discord|preview|scrap(?:e|er|ing|y)?\b|curl\/|wget|python-requests|okhttp|go-http-client|java\/|headlesschrome|lighthouse|pingdom|uptime|monitor/i;

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  // 관리자 경로는 별도의 이메일/비밀번호 인증을 사용하므로 익명 세션 자동 생성 대상에서 제외.
  if (request.nextUrl.pathname.startsWith('/admin')) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // 🔴 발급은 "진짜 페이지 이동"에서만 한다.
    //
    // 이게 이 파일의 가장 중요한 줄이다. 예전에는 세션 없는 모든 요청에 발급했는데,
    // Next.js는 한 번의 방문에도 RSC 요청과 <Link> 프리페치를 여러 건 함께 보낸다.
    // 그 요청들은 아직 쿠키가 없는 상태로 동시에 출발하므로, **방문자 1명이
    // 익명 계정을 여러 개 만들었다.** 프로필 생성량이 방문 기록의 약 2.8배였던
    // 이유가 이것이다(8/11 실측: 프로필 2,755 vs 방문 967).
    //
    // 실측으로 확인한 것: RSC 헤더만 붙여 요청해도 새 세션 쿠키가 내려왔다.
    // 문서 요청 / RSC 요청 / prefetch 요청 3종 모두 각각 계정을 만들고 있었다.
    //
    // 첫 진입은 반드시 문서 요청이고 클라이언트 내비게이션은 그 뒤에 오므로,
    // 여기서 걸러도 사용자가 세션을 못 받는 경우는 생기지 않는다.
    //
    // 🔴 `rsc` / `next-router-prefetch` 헤더로 판정하면 안 된다. Next.js가 그
    // 헤더들을 미들웨어 도달 전에 소비해버려서 여기서는 보이지 않는다 - 실제로
    // 미들웨어가 받는 헤더는 accept/host/user-agent/x-forwarded-* 뿐이었다.
    // (이 방식으로 한 번 배포했다가 효과가 0인 것을 확인하고 고쳤다.)
    // accept와 sec-fetch-dest는 도달하고, 두 요청을 정확히 가른다:
    //   문서 요청  accept: text/html,...        sec-fetch-dest: document
    //   RSC 요청   accept: text/x-component     sec-fetch-dest: empty
    const accept = request.headers.get('accept') ?? '';
    const fetchDest = request.headers.get('sec-fetch-dest');
    const isDocumentNavigation = fetchDest ? fetchDest === 'document' : accept.includes('text/html');
    if (!isDocumentNavigation) {
      return response;
    }

    // 🔴 봇도 건너뛴다. getSession()은 위에서 이미 돌렸으므로 기존 세션을 가진
    // 요청의 토큰 갱신에는 영향이 없다 - 여기서 막는 것은 "신규 발급"뿐이다.
    const userAgent = request.headers.get('user-agent') ?? '';
    if (!userAgent || BOT_UA.test(userAgent)) {
      return response;
    }
    // 사용자가 인지하지 못하는 사이 백그라운드에서 익명 세션을 발급한다.
    await supabase.auth.signInAnonymously();
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 정적 리소스, 이미지 최적화, favicon 등은 제외.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
