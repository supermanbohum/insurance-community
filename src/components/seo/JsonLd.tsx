/**
 * 구조화 데이터(schema.org) <script type="application/ld+json"> 렌더링 헬퍼.
 * JSON.stringify는 JSON 문법상 `<`를 이스케이프하지 않으므로, 파트너가 입력한 지점명/
 * 소개글 등에 `</script>`가 그대로 포함되면 스크립트 태그가 조기 종료될 수 있다 - 유니코드
 * 이스케이프로 막는다(값 자체는 그대로 유지되어 JSON 파싱 결과는 동일).
 */
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function JsonLd({ data }: { data: object | object[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: safeJsonLd(item) }}
        />
      ))}
    </>
  );
}
