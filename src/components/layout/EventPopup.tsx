'use client';

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { EVENT_POPUP_CONTENT } from '@/lib/config/event-popup';
import { cn } from '@/lib/utils';

const SESSION_KEY = 'bohummap-event-popup-hidden';
const SNOOZE_KEY = 'bohummap-event-popup-snooze-until';
const SHOW_DELAY_MS = 700;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 출시 이벤트 안내 팝업 - Root Layout(src/app/layout.tsx)에서 사이트 전체에 한 번만
 * 렌더링된다. 내용은 코드가 아니라 src/lib/config/event-popup.ts에서 가져오므로,
 * 다음 이벤트로 바꿀 때는 그 데이터 파일만 고치면 된다.
 *
 * 숨김 상태 2단계:
 * - 세션 동안만: sessionStorage (탭을 닫으면 다시 보임)
 * - "오늘 하루"/"7일간": localStorage에 만료 시각을 저장해 그 전까지는 아예 띄우지 않음
 */
export function EventPopup() {
  const [open, setOpen] = useState(false);
  const [snoozeToday, setSnoozeToday] = useState(false);
  const [snoozeWeek, setSnoozeWeek] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      const until = Number(localStorage.getItem(SNOOZE_KEY));
      if (until && Date.now() < until) return;
    } catch {
      // 프라이빗 모드 등으로 storage 접근이 막혀도 팝업은 그냥 보여준다.
    }
    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const close = useCallback(() => {
    try {
      if (snoozeWeek) {
        localStorage.setItem(SNOOZE_KEY, String(Date.now() + 7 * DAY_MS));
      } else if (snoozeToday) {
        localStorage.setItem(SNOOZE_KEY, String(Date.now() + DAY_MS));
      } else {
        sessionStorage.setItem(SESSION_KEY, '1');
      }
    } catch {
      // storage 접근 실패는 무시 - 다음 방문에 다시 뜨는 정도의 영향만 있다.
    }
    setOpen(false);
  }, [snoozeToday, snoozeWeek]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  if (!open) return null;

  const { eyebrow, headline, offerLabel, oldPrice, badge, highlight, highlightSuffix, description, features, footnote, ctaLabel } =
    EVENT_POPUP_CONTENT;

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
        <button
          type="button"
          onClick={close}
          aria-label="닫기"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-ink-faint/80 transition-colors hover:bg-black/[0.04] hover:text-ink"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>

        <div className="flex flex-col items-center gap-1 px-8 pb-6 pt-9 text-center">
          <span className="text-[13px] font-semibold tracking-wide text-ink-faint">{eyebrow}</span>
          <h2 className="text-[22px] font-bold tracking-tight text-ink">{headline}</h2>
        </div>

        <div className="mx-6 flex flex-col items-center gap-3 rounded-[22px] bg-[#F5F6F8] px-6 py-7 text-center">
          <span className="text-[13px] font-semibold text-ink-soft">{offerLabel}</span>
          <span className="text-sm text-ink-faint line-through decoration-ink-faint/60">{oldPrice}</span>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[34px] font-bold leading-none tracking-tight text-brand-600">
              {highlight}
              <span className="ml-1.5 text-base font-semibold text-ink-faint">{highlightSuffix}</span>
            </span>
          </div>
          <span className="mt-1 rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-semibold text-white">{badge}</span>
        </div>

        <div className="flex flex-col items-center gap-4 px-8 pb-2 pt-6 text-center">
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">{description}</p>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {features.map((feature) => (
              <span key={feature} className="rounded-full border border-line px-3 py-1 text-[11.5px] font-medium text-ink-soft">
                {feature}
              </span>
            ))}
          </div>
        </div>

        <p className="px-8 pb-5 pt-4 text-center text-[11px] leading-relaxed text-ink-faint">{footnote}</p>

        <div className="px-6 pb-4">
          <button
            type="button"
            onClick={close}
            className="w-full rounded-2xl bg-brand-600 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-brand-700 active:scale-[0.99]"
          >
            {ctaLabel}
          </button>
        </div>

        <div className="flex items-center justify-center gap-5 px-6 pb-6 pt-1 text-[11.5px] text-ink-faint">
          <SnoozeCheckbox
            label="오늘 하루 보지 않기"
            checked={snoozeToday}
            onChange={(checked) => {
              setSnoozeToday(checked);
              if (checked) setSnoozeWeek(false);
            }}
          />
          <SnoozeCheckbox
            label="7일간 보지 않기"
            checked={snoozeWeek}
            onChange={(checked) => {
              setSnoozeWeek(checked);
              if (checked) setSnoozeToday(false);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function SnoozeCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 select-none">
      <span
        className={cn(
          'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
          checked ? 'border-ink bg-ink' : 'border-line bg-white'
        )}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
            <path d="M2.5 6.2 5 8.7 9.5 3.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      {label}
    </label>
  );
}
