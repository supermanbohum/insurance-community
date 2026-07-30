'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { sendChatMessageAction } from '@/lib/actions/chat';

export function ChatComposer() {
  const [value, setValue] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = value.trim();
    if (!body || isPending) return;

    startTransition(async () => {
      const result = await sendChatMessageAction(body);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setValue('');
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-line bg-white p-3">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="메시지를 입력하세요"
        maxLength={500}
        className="flex-1 rounded-full border border-line bg-surface-sunken px-4 py-2.5 text-sm outline-none focus:border-brand-300 focus:bg-white"
      />
      <button
        type="submit"
        disabled={isPending || !value.trim()}
        aria-label="전송"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
