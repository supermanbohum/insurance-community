import { IS_MOCK_MODE } from '@/lib/mock/config';
import * as mockImpl from './branch.mock';
import * as supabaseImpl from './branch.supabase';

export type {
  BranchRow,
  BranchMediaRow,
  BranchContactRow,
  BranchRecruitRow,
  RegionRow,
  InsurerRow,
  BranchListRow,
} from './branch.supabase';

const impl = IS_MOCK_MODE ? mockImpl : supabaseImpl;

export const listBranches = impl.listBranches;
export const getBranchById = impl.getBranchById;
export const getBranchMedia = impl.getBranchMedia;
export const getBranchContacts = impl.getBranchContacts;
export const getBranchRecruits = impl.getBranchRecruits;
export const getBranchInsurerIds = impl.getBranchInsurerIds;
export const listRegions = impl.listRegions;
export const listInsurers = impl.listInsurers;
export const listApprovedGaCompaniesForSelect = impl.listApprovedGaCompaniesForSelect;
