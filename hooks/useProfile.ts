import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export type ProfileUpdateData = {
  full_name?: string;
  avatar_url?: string;
  // Add other profile fields as needed
};

export function useProfile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, profile, refreshProfile } = useAuth();

  // Update profile data
  const updateProfile = async (data: ProfileUpdateData) => {
    if (!user) {
      setError('You must be logged in to update your profile');
      return { success: false, error: 'Not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      // Add updated_at timestamp automatically
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Refresh the profile in auth context
      await refreshProfile();

      return { success: true };
    } catch (err) {
      console.error('Error updating profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Create profile if it doesn't exist
  const ensureProfileExists = async () => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, other errors are real issues
        throw checkError;
      }

      // If profile doesn't exist, create it
      if (!existingProfile) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          throw insertError;
        }
        
        // Refresh the profile in auth context
        await refreshProfile();
      }

      return { success: true };
    } catch (err) {
      console.error('Error ensuring profile exists:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    ensureProfileExists
  };
} 