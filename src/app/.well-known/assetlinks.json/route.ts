import { NextResponse } from 'next/server';

/**
 * W-069 - 안드로이드 App Links 검증 파일. Google이 이 경로를 리다이렉트 없이 200 +
 * application/json으로만 신뢰한다 - Route Handler로 직접 만드는 이유는 Next.js가
 * public/ 정적 파일의 Content-Type을 확장자만으로 추론해서 어긋날 여지가 있어서다
 * (여기서는 명시적으로 고정한다).
 *
 * CTO가 EAS Credentials(com.bohummap.app → Android upload keystore)에서 직접 확인해
 * 넘겨준 값이다(2026-08-08) - 서명 인증서의 공개 지문이고 이 파일 자체가 공개
 * 호스팅되는 용도라 비밀값이 아니다.
 */
const PACKAGE_NAME = 'com.bohummap.app';
const SHA256_CERT_FINGERPRINT = '45:49:19:76:1D:C2:DB:B5:BE:F6:B6:BA:5B:C6:45:49:4C:16:DE:C5:B8:88:66:2A:DF:64:71:E7:1E:23:F8:62';

export async function GET() {
  return NextResponse.json(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: PACKAGE_NAME,
          sha256_cert_fingerprints: [SHA256_CERT_FINGERPRINT],
        },
      },
    ],
    { headers: { 'Content-Type': 'application/json' } }
  );
}
