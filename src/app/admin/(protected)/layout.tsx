import { requireAdmin } from '@/lib/admin/session';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return <AdminShell adminName={admin.display_name}>{children}</AdminShell>;
}
