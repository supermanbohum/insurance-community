import { IS_MOCK_MODE } from '@/lib/mock/config';
import * as mockImpl from './insurer.mock';
import * as supabaseImpl from './insurer.supabase';

const impl = IS_MOCK_MODE ? mockImpl : supabaseImpl;

export const countActiveInsurers = impl.countActiveInsurers;
