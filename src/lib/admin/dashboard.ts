import { IS_MOCK_MODE } from '@/lib/mock/config';
import * as mockImpl from './dashboard.mock';
import * as supabaseImpl from './dashboard.supabase';

export type { DashboardStats } from './dashboard.supabase';

const impl = IS_MOCK_MODE ? mockImpl : supabaseImpl;

export const getDashboardStats = impl.getDashboardStats;
