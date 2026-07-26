import Link from 'next/link';

const ACTIONS = [
  {
    href: '/search?sort=views',
    emoji: '🔥',
    label: '인기 GA',
    tile: 'bg-rose-50',
  },
  {
    href: '/map',
    emoji: '📍',
    label: '내 주변',
    tile: 'bg-blue-50',
  },
  {
    href: '/search?sort=newest',
    emoji: '⭐',
    label: '신규 등록',
    tile: 'bg-amber-50',
  },
  {
    href: '/events',
    emoji: '🎁',
    label: '이벤트',
    tile: 'bg-violet-50',
  },
];

export function QuickActionCards() {
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {ACTIONS.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className={`group flex flex-col items-center gap-2 rounded-2xl border border-line py-4 text-center shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover active:scale-95 ${action.tile}`}
        >
          <span className="text-2xl leading-none">{action.emoji}</span>
          <span className="text-[11px] font-bold text-ink-soft">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
