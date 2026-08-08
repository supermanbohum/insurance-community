import { NextResponse } from 'next/server';

/**
 * W-069 - iOS Universal Links 검증 파일. 확장자가 없어야 하고(파일명 자체가
 * "apple-app-site-association"), Apple도 application/json으로만 신뢰한다 -
 * assetlinks.json과 같은 이유로 Route Handler를 쓴다.
 *
 * TEAM_ID.BUNDLE_ID는 앱팀이 채운다(2026-08-08 CTO 지시). paths를 "*"로 둔 건
 * 오늘 앱이 딥링크를 화이트리스트에서 패스스루로 전환한 것과 같은 원칙 -
 * 특정 경로만 허용하면 웹에 새 라우트가 생길 때마다 이 파일도 같이 고쳐야 한다.
 */
const TEAM_ID_BUNDLE_ID = 'TODO_APP_TEAM.TEAM_ID.BUNDLE_ID';

export async function GET() {
  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [{ appID: TEAM_ID_BUNDLE_ID, paths: ['*'] }],
      },
    },
    { headers: { 'Content-Type': 'application/json' } }
  );
}
