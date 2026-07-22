import { IS_MOCK_MODE } from '@/lib/mock/config';
import * as mockImpl from './ga.mock';
import * as supabaseImpl from './ga.supabase';

export type { PublicGaListItem } from './ga.supabase';

const impl = IS_MOCK_MODE ? mockImpl : supabaseImpl;

export const listPublicGaCompanies = impl.listPublicGaCompanies;
export const getGaRedirectTarget = impl.getGaRedirectTarget;
