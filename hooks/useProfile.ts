import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export type ProfileUpdateData = {
  display_name?: string;
  avatar_url?: string;
  email?: string;
  // Add other profile fields as needed
  contact?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  }
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
      // Extract contact data if present
      const contactData = data.contact;
      const profileData = { ...data };
      delete profileData.contact;

      // Start transaction
      let success = true;
      let errorMessage = '';

      // 1. Update profile data if needed
      if (Object.keys(profileData).length > 0) {
        // Add updated_at timestamp automatically
        const updateData: Omit<ProfileUpdateData, 'contact' | 'email'> & { updated_at: string } = {
          ...profileData,
          updated_at: new Date().toISOString()
        };
        
        console.log('Updating profile with data:', updateData);
        
        // NOTE: Do NOT try to update email here - it's protected
        // IMPORTANT: Remove any email field if present
        if ('email' in updateData) {
          delete updateData.email;
        }
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', user.id);

        if (updateError) {
          console.error('Supabase profile update error:', updateError);
          success = false;
          errorMessage = updateError.message;
        }
      }

      // 2. Update contact data if needed
      if (contactData && Object.keys(contactData).length > 0 && success) {
        // IMPORTANT: Do NOT try to update email in contacts
        const contactUpdateData = { ...contactData };
        if ('email' in contactUpdateData) {
          delete contactUpdateData.email;
        }
        
        // Get the contact_id from the profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('contact_id')
          .eq('id', user.id)
          .single();
        
        if (profileData?.contact_id) {
          const { error: contactError } = await supabase
            .from('contacts')
            .update(contactUpdateData)
            .eq('id', profileData.contact_id);
          
          if (contactError) {
            console.error('Supabase contact update error:', contactError);
            success = false;
            errorMessage = contactError.message;
          }
        }
      }

      // Return result
      if (!success) {
        setError(errorMessage);
      }
      
      return { success, error: errorMessage };
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' };
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
            display_name: user.user_metadata?.full_name || null,
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