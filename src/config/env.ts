import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

export const ENV = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || 'https://gomzansi.supabase.co',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_offline_and_testing',
  MAPBOX_ACCESS_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || extra.mapboxAccessToken || '',
  TRACKING_BASE_URL: process.env.EXPO_PUBLIC_TRACKING_BASE_URL || 'https://gomzansi.app/track',
  IS_DEMO: !process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL.includes('gomzansi.supabase.co'),
};
