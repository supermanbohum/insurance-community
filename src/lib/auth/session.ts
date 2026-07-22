import { IS_MOCK_MODE } from '@/lib/mock/config';
import * as mockImpl from './session.mock';
import * as supabaseImpl from './session.supabase';

export type { UserSession, AuthSessionProvider } from './types';

const impl = IS_MOCK_MODE ? mockImpl : supabaseImpl;

export const getCurrentUser = impl.getCurrentUser;
export const requireUser = impl.requireUser;
