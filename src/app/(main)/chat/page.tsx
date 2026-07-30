import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/session';
import { ChatPanel } from '@/components/chat/ChatPanel';

export const metadata: Metadata = {
  title: '실시간 채팅',
  robots: { index: false, follow: false },
};

export default async function ChatPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-4">
      <h1 className="text-lg font-extrabold tracking-tight text-ink">실시간 채팅</h1>
      <ChatPanel currentUser={user} variant="page" />
    </div>
  );
}
