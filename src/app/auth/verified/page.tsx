import { VerifiedScreen } from '@/components/auth/VerifiedScreen';

export default function AuthVerifiedPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = searchParams.next && searchParams.next.startsWith('/') ? searchParams.next : '/my';

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <VerifiedScreen next={next} />
    </div>
  );
}
