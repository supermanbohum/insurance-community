import { IS_MOCK_MODE } from '@/lib/mock/config';
import * as mockImpl from './inquiries.mock';
import * as supabaseImpl from './inquiries.supabase';

export type { ContactClickListItem, InquirySummary } from './inquiries.supabase';

const impl = IS_MOCK_MODE ? mockImpl : supabaseImpl;

export const getInquirySummary = impl.getInquirySummary;
export const listRecentContactClicks = impl.listRecentContactClicks;
