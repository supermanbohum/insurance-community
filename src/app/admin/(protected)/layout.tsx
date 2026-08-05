import { requireAdmin } from '@/lib/admin/session';
import { getPendingApprovalCounts } from '@/lib/admin/dashboard';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const [admin, navBadges] = await Promise.all([requireAdmin(), getPendingApprovalCounts()]);

  return (
    <AdminShell adminName={admin.display_name} navBadges={navBadges}>
      {children}
    </AdminShell>
  );
}
