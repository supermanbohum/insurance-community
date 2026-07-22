import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeCheck, ChevronRight, MapPin, RefreshCw } from 'lucide-react';
import { getPublicGaDetailBySlug } from '@/lib/public/ga';
import { avatarGradient, cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function GaDetailPage({ params }: { params: { slug: string } }) {
  const ga = await getPublicGaDetailBySlug(params.slug);
  if (!ga) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-4">
      <div className="relative h-24 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 sm:h-28">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }}
          aria-hidden
        />
        <div className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/10" aria-hidden />
      </div>

      <div className="-mt-9 flex flex-col gap-3 px-1">
        <div className="flex items-end justify-between">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-card ring-4 ring-white">
            {ga.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ga.logoUrl} alt={ga.name} className="h-full w-full object-cover" />
            ) : (
              <span
                className={cn(
                  'flex h-full w-full items-center justify-center bg-gradient-to-br text-xl font-extrabold text-white/90',
                  avatarGradient(ga.name)
                )}
              >
                {ga.name.charAt(0)}
              </span>
            )}
          </div>
          <span className="mb-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-brand-600 shadow-card">
            지점 {ga.branches.length}곳
          </span>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <h1 className="text-xl font-extrabold tracking-tight text-ink">{ga.name}</h1>
            {ga.isVerified && (
              <span className="flex items-center gap-0.5 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                공식 인증
              </span>
            )}
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-semibold',
                ga.operationType === 'direct' ? 'bg-gold-50 text-gold-600' : 'bg-surface-sunken text-ink-soft'
              )}
            >
              {ga.operationType === 'direct' ? '직영' : '지사'}
            </span>
          </div>
          {ga.ceoName && <p className="mt-0.5 text-sm text-ink-faint">대표 {ga.ceoName}</p>}
          <p className="mt-1 flex items-center gap-1 text-xs text-ink-faint">
            <RefreshCw className="h-3 w-3" />
            최근 업데이트 {new Date(ga.updatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
            <span className="mx-1 text-ink-faint">·</span>
            운영 형태 {ga.operationType === 'direct' ? '직영' : '지사'}
          </p>
        </div>
      </div>

      {ga.description && (
        <p className="whitespace-pre-line rounded-2xl border border-line bg-white p-4 text-sm leading-relaxed text-ink-soft shadow-card">
          {ga.description}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-[15px] font-extrabold tracking-tight text-ink">전국 지점 ({ga.branches.length})</h2>
        {ga.branches.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line py-14 text-ink-faint">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken">
              <MapPin className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <p className="text-sm">등록된 지점이 없습니다.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {ga.branches.map((branch, i) => (
              <li key={branch.id} className="stagger-item" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                <Link
                  href={`/branch/${branch.id}`}
                  className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-ink">{branch.name}</p>
                    <p className="truncate text-xs text-ink-faint">
                      {branch.sidoName ? `${branch.sidoName} ${branch.sigunguName ?? ''} · ` : ''}
                      {branch.address}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
