import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks for development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Log for debugging
console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Found' : 'Missing');

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

// Create the Supabase client
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-key'
); 