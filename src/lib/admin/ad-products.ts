import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { AD_PRODUCT_LABEL } from '@/lib/ad-products/catalog';
import type { AdProductType, BranchAdProductStatus, AdPaymentStatus } from '@/types/database';

export interface BranchAdProductListItem {
  id: string;
  branchId: string;
  branchName: string;
  gaCompanyName: string;
  productType: AdProductType;
  productLabel: string;
  startAt: string;
  endAt: string;
  status: BranchAdProductStatus;
  amountKrw: number | null;
  paymentStatus: AdPaymentStatus | null;
  createdAt: string;
}

async function toListItem(row: {
  id: string;
  branch_id: string;
  product_type: AdProductType;
  start_at: string;
  end_at: string;
  status: BranchAdProductStatus;
  payment_id: string | null;
  created_at: string;
}): Promise<BranchAdProductListItem> {
  const admin = createAdminClient();
  const [{ data: branch }, { data: payment }] = await Promise.all([
    admin.from('ga_branch').select('name, ga_company:ga_company_id(name)').eq('id', row.branch_id).maybeSingle(),
    row.payment_id ? admin.from('ad_payments').select('total_amount, status').eq('id', row.payment_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const gaCompany = branch?.ga_company as unknown as { name: string } | null;

  return {
    id: row.id,
    branchId: row.branch_id,
    branchName: branch?.name ?? '알 수 없는 지점',
    gaCompanyName: gaCompany?.name ?? '알 수 없는 GA',
    productType: row.product_type,
    productLabel: AD_PRODUCT_LABEL[row.product_type] ?? row.product_type,
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status,
    amountKrw: payment?.total_amount ?? null,
    paymentStatus: payment?.status ?? null,
    createdAt: row.created_at,
  };
}

export async function listBranchAdProducts(options: { status?: BranchAdProductStatus } = {}): Promise<BranchAdProductListItem[]> {
  const admin = createAdminClient();
  let query = admin.from('branch_ad_products').select('*').order('created_at', { ascending: false });
  if (options.status) query = query.eq('status', options.status);
  const { data } = await query;
  if (!data) return [];
  return Promise.all(data.map((row) => toListItem(row)));
}

export async function countPendingBranchAdProducts(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin.from('branch_ad_products').select('id', { count: 'exact', head: true }).eq('status', 'pending_review');
  return count ?? 0;
}

export interface BranchAdProductDetail extends BranchAdProductListItem {
  paymentMethod: string | null;
  vatKrw: number | null;
}

export async function getBranchAdProductDetail(id: string): Promise<BranchAdProductDetail | null> {
  const admin = createAdminClient();
  const { data: row } = await admin.from('branch_ad_products').select('*').eq('id', id).maybeSingle();
  if (!row) return null;

  const [listItem, { data: payment }] = await Promise.all([
    toListItem(row),
    row.payment_id ? admin.from('ad_payments').select('payment_method, vat').eq('id', row.payment_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return {
    ...listItem,
    paymentMethod: payment?.payment_method ?? null,
    vatKrw: payment?.vat ?? null,
  };
}
