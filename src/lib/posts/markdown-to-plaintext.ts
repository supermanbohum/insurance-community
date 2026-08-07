/**
 * W-062 - 관리자 글은 원문이 마크다운으로 저장돼(W-058) 렌더링 시에만 HTML로 바꾼다.
 * 메타 description·JSON-LD의 text 필드는 HTML로 렌더링되지 않으니 그 자리에 원문을
 * 그대로 넣으면 "# 제목", "**굵게**" 같은 마크다운 기호가 검색결과 스니펫과 구조화
 * 데이터에 그대로 노출된다. render-admin-markdown.ts처럼 정식 AST 파서를 쓸 것 없이
 * - 여긴 사람이 읽을 순수 텍스트만 있으면 되고 sanitize할 HTML을 만드는 게 아니라서 -
 * 문법 기호만 걷어내는 정규식으로 충분하다.
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^-{3,}\s*$/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
