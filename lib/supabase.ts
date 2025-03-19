import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks for development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Log for debugging (more detailed)
console.log('Supabase initialization:');
console.log('URL:', supabaseUrl ? supabaseUrl.substring(0, 15) + '...' : 'Missing');
console.log('Anon Key:', supabaseAnonKey ? supabaseAnonKey.substring(0, 5) + '...' : 'Missing');

// Check if we're in development and provide helpful messages
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase environment variables are missing!');
  console.error('Make sure you have a .env.local file with:');
  console.error('NEXT_PUBLIC_SUPABASE_URL=your-project-url');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
  
  // In development, we can use dummy values to prevent crashes
  if (process.env.NODE_ENV === 'development') {
    console.warn('Using dummy values for development. API calls will fail!');
  } else {
    throw new Error('Missing Supabase environment variables');
  }
}

// Create the Supabase client with additional options for debugging
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      fetch: (...args) => {
        console.log('Supabase API request:', args[0]);
        return fetch(...args);
      }
    }
  }
);

// Log on initialization to make sure the client was created
console.log('Supabase client initialized'); 