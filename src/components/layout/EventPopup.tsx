'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import type { EventPopupRow } from '@/lib/admin/event-popup';
import { cn } from '@/lib/utils';

const SHOW_DELAY_MS = 700;
const DAY_MS = 24 * 60 * 60 * 1000;
const FOREVER = 'forever';

type SnoozeChoice = 'none' | 'today' | 'week' | 'forever';

/** 팝업 인스턴스(=DB 행 id)별로 키를 분리한다 - 관리자가 새 이벤트로 내용을 바꾸면
 * id가 바뀌므로, 이전 이벤트를 "다시 보지 않기"로 닫았던 사람에게도 새 이벤트는 다시 뜬다. */
function storageKeys(id: string) {
  return {
    session: `bohummap-event-popup-${id}-hidden`,
    snooze: `bohummap-event-popup-${id}-snooze-until`,
  };
}

function isCurrentlyHidden(id: string): boolean {
  try {
    const keys = storageKeys(id);
    if (sessionStorage.getItem(keys.session)) return true;
    const raw = localStorage.getItem(keys.snooze);
    if (raw === FOREVER) return true;
    if (raw && Date.now() < Number(raw)) return true;
  } catch {
    // 프라이빗 모드 등으로 storage 접근이 막혀도 팝업은 그냥 보여준다.
  }
  return false;
}

/**
 * 출시 이벤트 안내 팝업 - Root Layout(src/app/layout.tsx)에서 사이트 전체에 한 번만
 * 렌더링된다. 내용/노출기간/on-off는 코드가 아니라 DB(event_popups, 관리자 화면
 * /admin/event-popup에서 편집)에서 오므로, 이 컴포넌트는 서버에서 이미 계산된
 * config만 받아 그린다 - config가 null이면(비활성/기간 밖) 아무것도 렌더링하지 않는다.
 */
export function EventPopup({ config }: { config: EventPopupRow | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [snoozeChoice, setSnoozeChoice] = useState<SnoozeChoice>('none');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!config) return;
    if (isCurrentlyHidden(config.id)) return;
    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [config]);

  const persistDismissal = useCallback(() => {
    if (!config) return;
    const keys = storageKeys(config.id);
    try {
      if (snoozeChoice === 'forever') {
        localStorage.setItem(keys.snooze, FOREVER);
      } else if (snoozeChoice === 'week') {
        localStorage.setItem(keys.snooze, String(Date.now() + 7 * DAY_MS));
      } else if (snoozeChoice === 'today') {
        localStorage.setItem(keys.snooze, String(Date.now() + DAY_MS));
      } else {
        sessionStorage.setItem(keys.session, '1');
      }
    } catch {
      // storage 접근 실패는 무시 - 다음 방문에 다시 뜨는 정도의 영향만 있다.
    }
  }, [config, snoozeChoice]);

  const close = useCallback(() => {
    persistDismissal();
    setOpen(false);
  }, [persistDismissal]);

  const handleCta = useCallback(() => {
    if (!config) return;
    persistDismissal();
    setOpen(false);
    router.push(config.ctaHref);
  }, [config, persistDismissal, router]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  // 최초 표시 시 아주 약한 컨페티 - prefers-reduced-motion이면 아예 건너뛴다.
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const colors = ['#2f6bff', '#93b4ff', '#ffd166', '#e5e9f2'];
    const particles = Array.from({ length: 22 }, () => ({
      x: width / 2 + (Math.random() - 0.5) * width * 0.7,
      y: -10 - Math.random() * 40,
      size: 3 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 1.4,
      vy: 1.6 + Math.random() * 1.8,
      rotation: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
    }));

    let raf = 0;
    let elapsed = 0;
    const duration = 1100;
    let last = performance.now();

    function tick(now: number) {
      const dt = now - last;
      last = now;
      elapsed += dt;
      ctx!.clearRect(0, 0, width, height);
      const fade = Math.max(0, 1 - elapsed / duration);
      for (const p of particles) {
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        p.rotation += p.vr;
        ctx!.save();
        ctx!.globalAlpha = fade * 0.85;
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rotation);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx!.restore();
      }
      if (elapsed < duration) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx!.clearRect(0, 0, width, height);
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  if (!open || !config) return null;

  const { eyebrow, headline, offerLabel, oldPrice, badge, highlight, highlightSuffix, description, features, footnote, ctaLabel } = config;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 animate-fade-in backdrop-blur-sm"
      onClick={close}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={headline}
        className="relative w-full max-w-[380px] animate-popup-in overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_-12px_rgba(15,23,42,0.35)]"
      >
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-x-0 top-0 z-10 h-40 w-full" aria-hidden="true" />

        <button
          type="button"
          onClick={close}
          aria-label="닫기"
          className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full text-ink-faint/80 transition-colors hover:bg-black/[0.04] hover:text-ink"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>

        {eyebrow || headline ? (
          <div className="flex flex-col items-center gap-1 px-8 pb-6 pt-9 text-center">
            {eyebrow && <span className="text-[13px] font-semibold tracking-wide text-ink-faint">{eyebrow}</span>}
            {headline && <h2 className="text-[22px] font-bold tracking-tight text-ink">{headline}</h2>}
          </div>
        ) : (
          <div className="h-6" />
        )}

        {(offerLabel || oldPrice || highlight || badge) && (
          <div className="mx-6 flex flex-col items-center gap-3 rounded-[22px] bg-[#F5F6F8] px-6 py-7 text-center">
            {offerLabel && <span className="text-[13px] font-semibold text-ink-soft">{offerLabel}</span>}
            {oldPrice && <span className="text-sm text-ink-faint line-through decoration-ink-faint/60">{oldPrice}</span>}
            {highlight && (
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[34px] font-bold leading-none tracking-tight text-brand-600">
                  {highlight}
                  {highlightSuffix && <span className="ml-1.5 text-base font-semibold text-ink-faint">{highlightSuffix}</span>}
                </span>
              </div>
            )}
            {badge && <span className="mt-1 rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-semibold text-white">{badge}</span>}
          </div>
        )}

        {(description || features.length > 0) && (
          <div className="flex flex-col items-center gap-4 px-8 pb-2 pt-6 text-center">
            {description && <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">{description}</p>}
            {features.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {features.map((feature) => (
                  <span key={feature} className="rounded-full border border-line px-3 py-1 text-[11.5px] font-medium text-ink-soft">
                    {feature}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {footnote && <p className="px-8 pb-5 pt-4 text-center text-[11px] leading-relaxed text-ink-faint">{footnote}</p>}

        <div className="px-6 pb-4">
          <button
            type="button"
            onClick={handleCta}
            className="w-full rounded-2xl bg-brand-600 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-brand-700 active:scale-[0.99]"
          >
            {ctaLabel}
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 px-6 pb-6 pt-1 text-[11px] text-ink-faint">
          <SnoozeCheckbox label="오늘 하루 보지 않기" active={snoozeChoice === 'today'} onToggle={(v) => setSnoozeChoice(v ? 'today' : 'none')} />
          <SnoozeCheckbox label="7일간 보지 않기" active={snoozeChoice === 'week'} onToggle={(v) => setSnoozeChoice(v ? 'week' : 'none')} />
          <SnoozeCheckbox label="다시 보지 않기" active={snoozeChoice === 'forever'} onToggle={(v) => setSnoozeChoice(v ? 'forever' : 'none')} />
        </div>
      </div>
    </div>
  );
}

function SnoozeCheckbox({ label, active, onToggle }: { label: string; active: boolean; onToggle: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 select-none">
      <span
        className={cn(
          'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
          active ? 'border-ink bg-ink' : 'border-line bg-white'
        )}
      >
        {active && (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
            <path d="M2.5 6.2 5 8.7 9.5 3.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <input type="checkbox" checked={active} onChange={(e) => onToggle(e.target.checked)} className="sr-only" />
      {label}
    </label>
  );
}
