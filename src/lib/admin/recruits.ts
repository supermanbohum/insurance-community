import { IS_MOCK_MODE } from '@/lib/mock/config';
import * as mockImpl from './recruits.mock';
import * as supabaseImpl from './recruits.supabase';

export type { RecruitListItem } from './recruits.supabase';

const impl = IS_MOCK_MODE ? mockImpl : supabaseImpl;

export const listAllRecruits = impl.listAllRecruits;
