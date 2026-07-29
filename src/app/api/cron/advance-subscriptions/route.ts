import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 매일 실행되는 결제 유예기간 만료 처리 - 7일 유예가 지난 구독을 suspended로
 * 바꾸고 해당 지점을 자동 비공개한다(advance_grace_period_expirations RPC,
 * 서비스롤 전용). Vercel Cron이 CRON_SECRET을 Authorization 헤더로 실어 호출한다
 * (vercel.json의 crons 설정 참고) - 그 외 요청은 거부한다.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('advance_grace_period_expirations');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ suspendedCount: data ?? 0 });
}
