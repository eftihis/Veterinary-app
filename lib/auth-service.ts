import { supabase } from './supabase';
// Removing unused import
// import { toast } from 'sonner';
import { Session } from '@supabase/supabase-js';

type SessionResponse = {
  data: {
    session: Session | null;
  };
  error: Error | null;
};

// Central service for all auth operations
export const authService = {
  // Update user password with retry logic
  updatePassword: async (newPassword: string, maxRetries = 2): Promise<{ data: any; error: any }> => {
    let attempts = 0;
    let lastError = null;
    
    while (attempts <= maxRetries) {
      try {
        // Create a promise with timeout for each attempt
        const timeoutDuration = 10000 + (attempts * 5000); // Increase timeout with each retry
        
        const result = await Promise.race([
          supabase.auth.updateUser({ password: newPassword }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out')), timeoutDuration)
          )
        ]) as { data: any; error: any };
        
        // If we get a successful response, return it
        if (result && !result.error) {
          console.log('Password update successful on attempt', attempts + 1);
          return result;
        }
        
        // If we got an error response, throw it to trigger retry
        if (result && result.error) {
          throw result.error;
        }
        
        return result;
      } catch (error) {
        console.warn(`Password update attempt ${attempts + 1} failed:`, error);
        lastError = error;
        attempts++;
        
        // Wait a bit longer before each retry (exponential backoff)
        if (attempts <= maxRetries) {
          console.log(`Retrying password update in ${2 * attempts} seconds...`);
          await new Promise(r => setTimeout(r, 2000 * attempts));
        }
      }
    }
    
    // If we've exhausted all retries
    console.error('Password update failed after', maxRetries + 1, 'attempts');
    return { 
      data: null, 
      error: lastError || new Error('Password update failed after multiple attempts') 
    };
  },
  
  // Sign out user
  signOut: async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during sign out:', error);
      throw error;
    }
  },
  
  // Get current session helper with timeout
  getSession: async (timeoutMs = 5000): Promise<SessionResponse> => {
    try {
      const result = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Session request timed out')), timeoutMs)
        )
      ]) as SessionResponse;
      
      return result;
    } catch (error) {
      console.error('Error getting session:', error);
      return {
        data: { session: null },
        error: error instanceof Error ? error : new Error('Unknown error getting session')
      };
    }
  }
}; 