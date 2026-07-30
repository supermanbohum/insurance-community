import type { ChatMessage } from '@/lib/chat/useChatMessages';

/** "(소속GA) 이름 설계사" 형태로 표시한다 - 소속GA가 없는 경우(아직 승인 안 됨 등)에도
 * 최소한 이름은 보이도록 괄호 부분만 생략한다. */
export function ChatMessageItem({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  const label = message.gaCompanyName ? `(${message.gaCompanyName}) ${message.nickname} 설계사` : `${message.nickname} 설계사`;

  return (
    <div className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
      <span className="text-[11px] font-semibold text-ink-faint">{label}</span>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
          isOwn ? 'bg-brand-600 text-white' : 'border border-line bg-white text-ink'
        }`}
      >
        {message.body}
      </div>
      <span className="text-[10px] text-ink-faint">
        {new Date(message.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}
