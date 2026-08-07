import 'server-only';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import type { Schema } from 'hast-util-sanitize';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import type { Root } from 'hast';

// W-058: author_name_type='admin' 글에만 적용하는 마크다운 렌더러. 일반 회원 글은
// 지금처럼 whitespace-pre-wrap 평문으로 유지한다(사용자가 입력한 *,#,[]() 등이
// 임의로 서식/링크로 해석되는 것을 막기 위해) - 관리자만 쓸 수 있는 경로라 서식을
// 허용해도 신뢰 경계가 명확하다. 태그를 화이트리스트로 제한해 sanitize한다.
const SANITIZE_SCHEMA: Schema = {
  tagNames: ['h2', 'h3', 'p', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'blockquote', 'hr', 'code'],
  attributes: {
    a: ['href'],
  },
  protocols: {
    href: ['http', 'https', 'mailto'],
  },
};

function rehypeExternalLinks() {
  return (tree: Root) => {
    visit(tree, 'element', (node) => {
      if (node.tagName === 'a') {
        node.properties = { ...node.properties, rel: ['nofollow', 'noopener'], target: '_blank' };
      }
    });
  };
}

/** 원고 첫 줄이 `# 제목`이면 제거한다 - 페이지 자체 <h1>과 중복 표시되는 것을 막기 위함
 * (저장된 content는 건드리지 않고 렌더링 시점에만 제거한다). */
function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^\s*#\s+.+\r?\n?/, '');
}

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeSanitize, SANITIZE_SCHEMA)
  .use(rehypeExternalLinks)
  .use(rehypeStringify);

export function renderAdminPostContent(markdown: string): string {
  return String(processor.processSync(stripLeadingH1(markdown)));
}
