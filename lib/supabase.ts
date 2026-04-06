import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// On web, use localStorage (available in browser only).
// On native, use AsyncStorage (imported lazily to avoid touching it during SSR/export).
function getStorage() {
  if (Platform.OS === 'web') {
    // During static export `window` does not exist — return a no-op storage so
    // the module can be imported without crashing.
    if (typeof window === 'undefined') {
      return {
        getItem:    (_key: string) => Promise.resolve(null),
        setItem:    (_key: string, _value: string) => Promise.resolve(),
        removeItem: (_key: string) => Promise.resolve(),
      };
    }
    return localStorage;
  }
  // Native: require lazily so the import never runs during web export
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return AsyncStorage;
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    storage:            getStorage(),
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});
