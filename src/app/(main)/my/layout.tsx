import { requireUser } from '@/lib/auth/session';

/** Route Guard/Protected Route - /my 이하 전체(기존 /my/posts 포함)를 보호한다. */
export default async function MyLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <>{children}</>;
}
