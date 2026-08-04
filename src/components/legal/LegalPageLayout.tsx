import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

/**
 * /terms, /privacy가 공유하는 chrome. 본문(조항 마크업)은 각 페이지가 직접 쓴다 -
 * 두 문서의 구조(조항 번호 vs 항목 리스트)가 달라 억지로 공통 스키마로 묶지 않았다.
 * 다크모드는 globals.css의 .legal-page 스코프 변수가 prefers-color-scheme를
 * 그대로 따라간다(사이트 전역 다크모드 토글과는 무관, 이 문서 안에서만 동작).
 */
export function LegalPageLayout({
  title,
  effectiveDate,
  dateLabel = '시행일',
  children,
}: {
  title: string;
  effectiveDate: string;
  /** /contact처럼 "시행일" 개념이 어색한 페이지를 위한 라벨 오버라이드(예: "안내"). */
  dateLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="legal-page bg-[var(--lp-bg)]">
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
        <Link
          href="/"
          className="mb-6 flex w-fit items-center gap-1 text-[13px] font-medium text-[var(--lp-ink-faint)] transition-colors hover:text-[var(--lp-brand)]"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          홈으로
        </Link>

        <header className="mb-8 border-b border-[var(--lp-line)] pb-6">
          <h1 className="text-[26px] font-extrabold tracking-tight text-[var(--lp-ink)] sm:text-[30px]">{title}</h1>
          <p className="mt-2 text-[13px] text-[var(--lp-ink-faint)]">{dateLabel}: {effectiveDate}</p>
        </header>

        <article className="rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-card)] p-5 sm:p-8">{children}</article>
      </div>
    </div>
  );
}

export function LegalSection({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-6 border-b border-[var(--lp-line)] py-6 first:pt-0 last:border-b-0 last:pb-0">
      <h2 className="mb-3 text-[16px] font-bold text-[var(--lp-ink)]">{title}</h2>
      <div className="flex flex-col gap-2.5 text-[14px] leading-relaxed text-[var(--lp-ink-soft)]">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5 pl-4">
      {items.map((item, i) => (
        <li key={i} className="list-disc marker:text-[var(--lp-ink-faint)]">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function LegalTable({
  head,
  rows,
}: {
  head: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--lp-line)]">
      <table className="w-full min-w-[480px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="bg-[var(--lp-brand-soft)]">
            {head.map((h) => (
              <th key={h} className="border-b border-[var(--lp-line)] px-3 py-2.5 font-bold text-[var(--lp-ink)]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--lp-line)] last:border-b-0">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2.5 text-[var(--lp-ink-soft)]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
