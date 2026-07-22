import { IS_MOCK_MODE } from '@/lib/mock/config';
import * as mockImpl from './ga.mock';
import * as supabaseImpl from './ga.supabase';

export type { GaCompanyRow, GaBranchRow, GaMediaRow } from './ga.supabase';

const impl = IS_MOCK_MODE ? mockImpl : supabaseImpl;

export const listGaCompanies = impl.listGaCompanies;
export const getGaCompanyById = impl.getGaCompanyById;
export const getBranchesByGaCompanyId = impl.getBranchesByGaCompanyId;
export const getGaMedia = impl.getGaMedia;
