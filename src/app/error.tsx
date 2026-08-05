'use client';

import { ErrorContent } from '@/components/shared/ErrorContent';

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorContent error={error} reset={reset} homeHref="/" />;
}
