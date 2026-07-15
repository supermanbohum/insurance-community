/**
 * 랜덤 익명 작성자명 생성.
 * 작성자명을 직접 입력하지 않았을 때 서버(글 제출 처리 시점)에서만 호출한다.
 * 형식: "익명" + 0000~9999 사이 4자리 숫자.
 */
export function generateAnonName(): string {
  const number = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `익명${number}`;
}
