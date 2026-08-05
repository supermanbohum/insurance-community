'use client';

// 루트 레이아웃(src/app/layout.tsx) 자체가 던지는 에러의 최후 방어선 - 이 경우
// 레이아웃이 렌더링되지 않으므로 layout.tsx가 불러오는 전역 CSS/폰트에
// 의존할 수 없다. 그래서 Tailwind 클래스 대신 인라인 스타일만 쓰고,
// <html>/<body>를 직접 선언한다(Next.js 공식 요구사항).
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>일시적인 오류가 발생했습니다</h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>잠시 후 다시 시도해주세요.</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                borderRadius: '9999px',
                border: 'none',
                background: '#2563eb',
                color: '#fff',
                fontWeight: 700,
                fontSize: '14px',
                padding: '10px 20px',
                cursor: 'pointer',
              }}
            >
              다시 시도
            </button>
            <a
              href="/"
              style={{
                borderRadius: '9999px',
                border: '1px solid #e2e8f0',
                color: '#334155',
                fontWeight: 700,
                fontSize: '14px',
                padding: '10px 20px',
                textDecoration: 'none',
              }}
            >
              홈으로 이동
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
