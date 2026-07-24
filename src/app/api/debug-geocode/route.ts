import { NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/geo/geocode';

export const dynamic = 'force-dynamic';

/** KAKAO_REST_API_KEY가 실제로 동작하는지 확인하는 임시 진단 엔드포인트. */
export async function GET() {
  const hasKey = Boolean(process.env.KAKAO_REST_API_KEY);
  const result = await geocodeAddress('서울특별시 강남구 테헤란로 427');
  return NextResponse.json({ hasKey, result });
}
