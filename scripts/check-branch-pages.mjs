#!/usr/bin/env node
/**
 * 공개된 지점이 **실제로 열리는지** 점검한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 만들었나 (오너 지시 2026-09-04: 「앞으로 이런일없도록해」)
 * ─────────────────────────────────────────────────────────────────────────────
 * 지점 승인 2건 뒤 「홈에서 눌러도 안 들어가진다」는 신고가 왔다. 그때 확인한 것을
 * 사람이 매번 손으로 하지 않게 스크립트로 남긴다. 승인 직후 한 번 돌리면 된다.
 *
 * 🔴 무엇을 「열린다」로 볼 것인가 — 여기서 두 번 틀릴 수 있다
 *   ① `HTTP 200` 은 근거가 아니다. Next.js 는 **not-found 페이지도 200** 으로 내려준다.
 *   ② 부분 문자열 grep 도 근거가 아니다. 「찾을 수 없습니다」는 검색 UI 문구로도 걸린다
 *      (실제로 2026-09-04에 정상 페이지를 NOT FOUND 로 오판했다).
 *   → 그래서 **<title> 에 지점 이름이 들어있는지**로 판정한다.
 *      정상: 「마스터 | 광명시 보험대리점 | 보험맵」
 *
 * ⚠️ 이 스크립트가 보는 것은 **서버가 그 URL 로 페이지를 내려주는가**까지다.
 *    「홈 카드를 눌러서 들어가지는가」(클릭·캐러셀 문제)는 여기서 못 잡는다 —
 *    그건 브라우저에서 실제로 눌러 봐야 한다.
 *
 * 사용법:
 *   node scripts/check-branch-pages.mjs                 # 최근 20건
 *   node scripts/check-branch-pages.mjs --all           # 공개된 전체
 *   node scripts/check-branch-pages.mjs --site=http://localhost:3000
 *
 * 필요한 것: .env.local 의 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
 *            (읽기 전용 공개 키다. 서비스롤 키는 쓰지 않는다.)
 */

import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const ALL = args.includes('--all');
const SITE = (args.find((a) => a.startsWith('--site=')) || '--site=https://bohummap.com').split('=').slice(1).join('=');
const LIMIT = ALL ? 1000 : 20;

function readEnv() {
  let raw = '';
  try {
    raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  } catch {
    // CI 등에서는 파일 없이 환경변수로 줄 수 있다
  }
  const pick = (key) => {
    if (process.env[key]) return process.env[key];
    const m = raw.match(new RegExp('^' + key + '=(.*)$', 'm'));
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
  };
  return { url: pick('NEXT_PUBLIC_SUPABASE_URL'), key: pick('NEXT_PUBLIC_SUPABASE_ANON_KEY') };
}

const { url: SUPABASE_URL, key: ANON_KEY } = readEnv();
if (!SUPABASE_URL || !ANON_KEY) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 를 찾지 못했다.');
  process.exit(2);
}

// 🔴 status·registration_status 만 보지 않는다. deleted_at 을 함께 본다 -
//    소프트 삭제된 행이 status='visible' 로 남아 있는 사례가 실제로 있다.
const query =
  `${SUPABASE_URL}/rest/v1/ga_branch` +
  `?select=id,name,slug,status,registration_status,deleted_at,created_at` +
  `&status=eq.visible&registration_status=eq.approved&deleted_at=is.null` +
  `&order=created_at.desc&limit=${LIMIT}`;

const res = await fetch(query, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } });
if (!res.ok) {
  console.error(`✗ 지점 목록 조회 실패: HTTP ${res.status} ${await res.text()}`);
  process.exit(2);
}
const branches = await res.json();

console.log(`대상 ${branches.length}건 · ${SITE}\n`);

let bad = 0;
for (const b of branches) {
  const target = `${SITE}/branch/${encodeURIComponent(b.slug)}`;
  let verdict;
  try {
    const r = await fetch(target, { headers: { 'User-Agent': 'boheommap-branch-check' } });
    const html = await r.text();
    const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1].trim();
    // 판정: 제목에 지점 이름이 들어있어야 한다(위 주석 ①② 참고)
    const ok = r.status === 200 && title.includes(b.name);
    verdict = ok ? null : `HTTP ${r.status} · <title>=${title || '(없음)'}`;
  } catch (err) {
    verdict = `요청 실패: ${err.message}`;
  }

  if (verdict) {
    bad += 1;
    console.log(`✗ ${b.name}\n    ${target}\n    ${verdict}`);
  } else {
    console.log(`✓ ${b.name}`);
  }
}

console.log(`\n정상 ${branches.length - bad}건 · 문제 ${bad}건`);
process.exit(bad > 0 ? 1 : 0);
