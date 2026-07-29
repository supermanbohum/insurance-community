import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd, type BreadcrumbItem } from '@/lib/seo/jsonld';

/** 시각적 브레드크럼 내비게이션 + 동일 데이터의 BreadcrumbList JSON-LD를 함께 출력한다. */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(items)} />
      <nav aria-label="브레드크럼" className="mb-3 flex flex-wrap items-center gap-1 text-[12px] text-ink-faint">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
              {item.href && !isLast ? (
                <Link href={item.href} className="transition-colors hover:text-brand-600">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'font-medium text-ink-soft' : undefined}>{item.label}</span>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}
