/**
 * supabase.rpc('create_comment') 호출 시 SQL 함수가 `raise exception 'CODE_NAME'`으로
 * 던진 코드를 사용자에게 보여줄 한국어 메시지로 변환한다. post-errors.ts와 동일한 패턴.
 */
const ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: '세션이 만료되었습니다. 새로고침 후 다시 시도해주세요.',
  NOT_FULL_MEMBER: '이메일 인증(또는 카카오 연동 인증)을 완료한 정회원만 댓글을 작성할 수 있습니다.',
  USER_BLOCKED: '이용이 제한된 계정입니다.',
  INVALID_INPUT: '댓글 내용을 입력해주세요.',
  INVALID_AUTHOR_NAME: '작성자명을 확인해주세요.',
  POST_NOT_FOUND: '삭제되었거나 존재하지 않는 글입니다.',
  INVALID_PARENT_COMMENT: '답글을 달 수 없는 댓글입니다.',
  BANNED_WORD: '커뮤니티 운영 원칙에 따라 등록할 수 없는 표현이 포함되어 있습니다. 표현을 수정해 다시 시도해 주세요.',
  RATE_LIMITED: '잠시 후 다시 시도해 주세요. 짧은 시간에 너무 많은 댓글이 등록되어 잠시 제한되었습니다.',
  BURST_LIMITED: '잠시 후 다시 시도해 주세요. 짧은 시간에 너무 많은 댓글이 등록되어 잠시 제한되었습니다.',
  DUPLICATE_CONTENT: '직전에 작성한 댓글과 내용이 같습니다. 내용을 수정해 다시 시도해 주세요.',
  NOT_COMMENT_OWNER: '본인이 작성한 댓글만 삭제할 수 있습니다.',
};

const DEFAULT_MESSAGE = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';

export function toCommentErrorMessage(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error ?? '');
  const matchedCode = Object.keys(ERROR_MESSAGES).find((code) => rawMessage.includes(code));
  return matchedCode ? ERROR_MESSAGES[matchedCode] : DEFAULT_MESSAGE;
}
