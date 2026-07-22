import { Camera, Video, MessageCircle, Rss, MessageSquareText, type LucideIcon } from 'lucide-react';

interface SnsLink {
  key: string;
  label: string;
  icon: LucideIcon;
  url: string | null;
}

export function GaSnsLinks({
  blogUrl,
  instagramUrl,
  youtubeUrl,
  kakaoChannelUrl,
  openChatUrl,
}: {
  blogUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  kakaoChannelUrl: string | null;
  openChatUrl: string | null;
}) {
  const rawLinks: SnsLink[] = [
    { key: 'blog', label: '블로그', icon: Rss, url: blogUrl },
    { key: 'instagram', label: '인스타그램', icon: Camera, url: instagramUrl },
    { key: 'youtube', label: '유튜브', icon: Video, url: youtubeUrl },
    { key: 'kakao_channel', label: '카카오채널', icon: MessageCircle, url: kakaoChannelUrl },
    { key: 'open_chat', label: '오픈채팅', icon: MessageSquareText, url: openChatUrl },
  ];
  const links = rawLinks.filter((l) => Boolean(l.url)).map((l) => ({ ...l, url: l.url as string }));

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {links.map((link) => {
        const Icon = link.icon;
        const href = /^https?:\/\//.test(link.url) ? link.url : `https://${link.url}`;
        return (
          <a
            key={link.key}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-brand-200 hover:text-brand-600"
          >
            <Icon className="h-3.5 w-3.5" />
            {link.label}
          </a>
        );
      })}
    </div>
  );
}
