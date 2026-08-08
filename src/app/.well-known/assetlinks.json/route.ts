import { NextResponse } from 'next/server';

/**
 * W-069 - 안드로이드 App Links 검증 파일. Google이 이 경로를 리다이렉트 없이 200 +
 * application/json으로만 신뢰한다 - Route Handler로 직접 만드는 이유는 Next.js가
 * public/ 정적 파일의 Content-Type을 확장자만으로 추론해서 어긋날 여지가 있어서다
 * (여기서는 명시적으로 고정한다).
 *
 * PACKAGE_NAME/SHA256_CERT_FINGERPRINT는 아직 값이 없다 - 패키지명은 앱팀이,
 * 서명 지문은 CTO가 EAS에서 확보해 채우기로 했다(2026-08-08 CTO 지시). 값이 채워지기
 * 전까지는 Google이 검증에 실패할 뿐이라 무해하지만, 실제 사용자에게 영향을 주는
 * 값이라 임의로 지어내지 않았다.
 */
const PACKAGE_NAME = 'TODO_APP_TEAM_PACKAGE_NAME';
const SHA256_CERT_FINGERPRINT = 'TODO_CTO_EAS_SHA256_FINGERPRINT';

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
