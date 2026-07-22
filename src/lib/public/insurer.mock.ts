import 'server-only';
import { mockStore } from '@/lib/mock/store';

export async function countActiveInsurers(): Promise<number> {
  return mockStore.insurers.filter((i) => i.is_active).length;
}
