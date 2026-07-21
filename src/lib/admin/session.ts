import { IS_MOCK_MODE } from '@/lib/mock/config';
import * as mockImpl from './session.mock';
import * as supabaseImpl from './session.supabase';

export type { AdminSession } from './session.supabase';

const impl = IS_MOCK_MODE ? mockImpl : supabaseImpl;

export const getCurrentAdmin = impl.getCurrentAdmin;
export const requireAdmin = impl.requireAdmin;
