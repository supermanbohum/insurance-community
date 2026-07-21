import { IS_MOCK_MODE } from '@/lib/mock/config';
import * as mockImpl from './region.mock';
import * as supabaseImpl from './region.supabase';

export type { SidoGroup, SigunguItem } from './region.supabase';

const impl = IS_MOCK_MODE ? mockImpl : supabaseImpl;

export const listSidoGroups = impl.listSidoGroups;
export const listSigunguBySido = impl.listSigunguBySido;
export const getRegionById = impl.getRegionById;
