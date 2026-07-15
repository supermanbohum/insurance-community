/**
 * supabase.rpc() 호출 시 SQL 함수가 `raise exception 'CODE_NAME'`으로 던진 코드를
 * 사용자에게 보여줄 한국어 메시지로 변환한다. 알 수 없는 에러는 기본 메시지로 대체한다.
 */
const ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: '세션이 만료되었습니다. 새로고침 후 다시 시도해주세요.',
  USER_BLOCKED: '이용이 제한된 계정입니다.',
  INVALID_INPUT: '제목과 본문을 모두 입력해주세요.',
  INVALID_AUTHOR_NAME: '작성자명을 확인해주세요.',
  INVALID_CATEGORY: '유효하지 않은 카테고리입니다.',
  BANNED_WORD: '금지어 또는 개인정보로 의심되는 내용이 포함되어 있습니다.',
  RATE_LIMITED: '잠시 후 다시 작성해주세요.',
  DAILY_LIMIT_EXCEEDED: '오늘 작성 가능한 글 수를 모두 사용했습니다.',
  NOT_POST_OWNER: '본인이 작성한 글만 수정/삭제할 수 있습니다.',
  NOT_POST_OWNER_OR_ALREADY_PUBLISHED: '처리할 수 없는 요청입니다.',
  NOT_FOUND_OR_NOT_OWNER: '이미지를 찾을 수 없거나 권한이 없습니다.',
  IMAGE_LIMIT_EXCEEDED: '이미지는 최대 5장까지 첨부할 수 있습니다.',
};

const DEFAULT_MESSAGE = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';

export function toPostErrorMessage(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error ?? '');
  const matchedCode = Object.keys(ERROR_MESSAGES).find((code) => rawMessage.includes(code));
  return matchedCode ? ERROR_MESSAGES[matchedCode] : DEFAULT_MESSAGE;
}
