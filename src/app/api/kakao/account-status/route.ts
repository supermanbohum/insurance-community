import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyKakaoSecurityEventToken, shouldWithdraw } from '@/lib/kakao/verifySecurityEventToken';

/**
 * 카카오 「계정 상태 변경 웹훅(User Unlinked)」 수신부.
 *
 * 사용자가 카카오 쪽에서 우리 앱 연결을 끊거나 카카오 계정을 탈퇴하면 카카오가 여기로
 * 알려준다. 이게 없으면 우리는 그 사실을 모르고 개인정보가 그대로 남는다 - /privacy가
 * "탈퇴 시 지체 없이 파기"라고 약속하는데 카카오 경로로 나간 사람은 그 약속 밖이었다.
 *
 * 처리: (가) 탈퇴 처리(오너 확정 2026-08-11). 카카오 가입자는 비밀번호가 없어 연결이
 * 끊기면 로그인 수단 자체가 사라지므로, 계정을 남기면 아무도 접근 못 하는 곳에
 * 개인정보만 남는다.
 *
 * 🔴 「계정 상태 변경 웹훅」은 단일 사건이 아니라 17종 이벤트 묶음이다. 그중
 * 탈퇴로 처리하는 것은 user-unlinked(앱 연결 해제)와 account-purged(계정 탈퇴)
 * 둘뿐이고, 나머지는 기록만 남긴다(outcome='ignored'). 목록은
 * verifySecurityEventToken.ts의 WITHDRAW_EVENT_URIS에 카카오 문서 원문으로 박아 뒀다.
 *
 * 응답 규약(카카오 문서): 검증 성공 시 3초 내 202, 실패 시 400.
 * 🔴 실패를 202로 돌려주면 카카오가 전달 성공으로 보고 재시도하지 않는다 -
 * 그 사용자의 탈퇴는 영원히 처리되지 않는다. 실패는 반드시 400으로 알린다.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const admin = createAdminClient();
  const rawBody = await request.text();

  const verified = await verifyKakaoSecurityEventToken(rawBody);

  if (!verified.ok) {
    // 🔴 검증 실패도 남긴다. 남기지 않으면 "안 온 것"과 "와서 튕긴 것"이 같은 모양이라
    // 콘솔에 웹훅을 등록했는지조차 확인할 수 없다.
    await admin.from('kakao_webhook_events').insert({
      kakao_user_id: null,
      reason: null,
      raw_claims: null,
      matched_user_id: null,
      outcome: 'error',
      error_message: verified.error,
    });
    // RFC8935가 요구하는 형식. 카카오가 이 본문을 그대로 콘솔에 보여준다.
    return NextResponse.json(
      { err: 'invalid_request', description: verified.error },
      { status: 400 }
    );
  }

  // verifyKakaoSecurityEventToken이 sub 없는 토큰을 MISSING_SUB로 이미 걷어냈다.
  // 여기까지 왔다면 반드시 값이 있다.
  const kakaoUserId = verified.claims.sub as string;

  // 🔴 이벤트 종류를 보고 처리 대상일 때만 탈퇴시킨다.
  //
  // 「계정 상태 변경 웹훅」은 하나의 사건이 아니라 **17종짜리 묶음**이다. 콘솔에서
  // 켤 수 있는 것 중에는 User Linked(앱 연결)·User Scope Consent(동의)처럼
  // **사용자가 가입/연결하는 순간 오는 이벤트**가 있다. 이벤트 종류를 안 보면
  // 그 사람을 그 자리에서 탈퇴 처리한다 - 닉네임이 「탈퇴한 회원」이 되고
  // 이메일·연락처가 지워진다. 안 시킨 일을 하는 쪽이라 훨씬 위험하다.
  //
  // 화이트리스트 방식이다. 목록에 있는 것만 처리하고 나머지는 기록만 남긴다.
  if (!shouldWithdraw(verified.eventUris)) {
    await admin.from('kakao_webhook_events').insert({
      kakao_user_id: kakaoUserId,
      reason: verified.reason,
      raw_claims: verified.claims as unknown as Record<string, unknown>,
      matched_user_id: null,
      // 🔴 no_match로 떨어뜨리지 않는다. no_match는 "우리 사용자가 아니었다"는
      // 뜻이라, 섞으면 나중에 로그를 봐도 무엇이 왔는지 구분할 수 없다.
      outcome: 'ignored',
      error_message: null,
    });
    // 우리가 처리하지 않기로 한 것이지 전달이 실패한 게 아니다 → 202.
    // 400을 주면 카카오가 계속 재시도한다.
    return NextResponse.json({ outcome: 'ignored' }, { status: 202 });
  }

  const { data, error } = await admin.rpc('withdraw_kakao_user', {
    p_kakao_user_id: kakaoUserId,
  });

  if (error) {
    await admin.from('kakao_webhook_events').insert({
      kakao_user_id: kakaoUserId,
      reason: verified.reason,
      raw_claims: verified.claims as unknown as Record<string, unknown>,
      matched_user_id: null,
      outcome: 'error',
      error_message: error.message,
    });
    // 우리 쪽 장애다. 400을 주면 카카오가 "요청이 잘못됐다"로 읽고 재시도하지 않을 수
    // 있어, 500으로 알려 재시도 여지를 남긴다.
    return NextResponse.json({ err: 'server_error' }, { status: 500 });
  }

  // RPC가 { outcome, user_id }를 돌려준다. 🔴 matched_user_id를 라우트에서 다시
  // 조회하지 않는 이유: 카카오 회원번호 → 우리 사용자 매핑은 auth 스키마를 거쳐야 하고,
  // 그 조회를 두 곳에 두면 판정 기준이 갈린다. 찾은 쪽이 알려주게 했다.
  type Outcome = 'withdrawn' | 'already_withdrawn' | 'no_match';
  const result = (data ?? {}) as { outcome?: Outcome; user_id?: string | null };
  // 모르는 outcome이 오면 no_match로 떨어뜨린다 - 로그 CHECK 제약을 위반해
  // insert가 통째로 실패하면 그 사건의 기록 자체가 사라진다.
  const known: Outcome[] = ['withdrawn', 'already_withdrawn', 'no_match'];
  const outcome: Outcome = result.outcome && known.includes(result.outcome) ? result.outcome : 'no_match';
  const matchedUserId = result.user_id ?? null;

  await admin.from('kakao_webhook_events').insert({
    kakao_user_id: kakaoUserId,
    reason: verified.reason,
    raw_claims: verified.claims as unknown as Record<string, unknown>,
    matched_user_id: matchedUserId,
    outcome,
    error_message: null,
  });

  // no_match도 202다. 우리에게 없는 사용자에 대한 통보는 카카오 입장에서 정상 전달이고,
  // 400을 주면 카카오가 계속 재시도한다. 우리 쪽 기록은 로그에 남는다.
  return NextResponse.json({ outcome }, { status: 202 });
}
