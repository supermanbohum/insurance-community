import { IS_MOCK_MODE } from '@/lib/mock/config';
import * as mockImpl from './ga.mock';
import * as supabaseImpl from './ga.supabase';

export type { PublicGaListItem, PublicGaDetail } from './ga.supabase';

const impl = IS_MOCK_MODE ? mockImpl : supabaseImpl;

export const listPublicGaCompanies = impl.listPublicGaCompanies;
export const getPublicGaDetailBySlug = impl.getPublicGaDetailBySlug;
