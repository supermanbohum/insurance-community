import { IS_MOCK_MODE } from '@/lib/mock/config';
import * as mockImpl from './branch.mock';
import * as supabaseImpl from './branch.supabase';

export type { BranchSortOption, BranchDetail } from './branch.supabase';

const impl = IS_MOCK_MODE ? mockImpl : supabaseImpl;

export const listPublicBranches = impl.listPublicBranches;
export const getPublicBranchDetail = impl.getPublicBranchDetail;
export const recordBranchView = impl.recordBranchView;
export const recordBranchContactClick = impl.recordBranchContactClick;
