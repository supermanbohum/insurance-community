/** 날짜가 바뀔 때마다 메시지 목록 사이에 끼워 넣는 구분선. 매일 자정(KST) 기준
 * 채팅이 초기화되므로 평소엔 하루치만 보이지만, "이전 메시지 더 보기"로 지난
 * 대화를 이어 볼 때를 대비해 날짜 구분 자체는 항상 동작하도록 만들어둔다. */
export function ChatDateDivider({ dateKey }: { dateKey: string }) {
  const label = new Date(`${dateKey}T00:00:00+09:00`).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="my-1 flex items-center gap-3">
      <span className="h-px flex-1 bg-line" />
      <span className="shrink-0 text-[11px] font-medium text-ink-faint">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/** 메시지의 createdAt(UTC ISO)을 KST 기준 "YYYY-MM-DD" 키로 변환한다 - 자정(KST) 직후에
 * 생성된 메시지가 UTC로는 여전히 전날인 착시가 없도록 항상 Asia/Seoul 기준으로 계산한다. */
export function toKstDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}
