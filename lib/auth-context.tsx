"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { authService } from './auth-service';

// Add a type for the profile data
type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
  contact_id: string;
  user_role: string | null;
  contacts?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  };
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null; // Add profile to the context
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{
    error: Error | null;
  }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>; // Add a function to refresh profile data
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null); // Add profile state
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch profile data
  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      // Query profile with contact join
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          contacts:contact_id (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return null;
      }

      console.log('Profile data:', data);
      return data as Profile;
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      return null;
    }
  };

  // Function to refresh profile data
  const refreshProfile = async () => {
    if (!user) return;
    
    console.log('Refreshing profile data for user:', user.id);
    
    // Clear any cached data
    try {
      // Use same query format as fetchProfile to ensure contacts are included
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          contacts:contact_id (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('id', user.id)
        .single();
      
      console.log('Refresh profile result:', data ? 'Profile found' : 'No profile found', error ? `Error: ${JSON.stringify(error)}` : '');
      
      if (data) {
        console.log('Setting refreshed profile data:', data);
        setProfile(data as Profile);
      } else if (error) {
        console.error('Error in refreshProfile:', error);
      }
    } catch (err) {
      console.error('Exception in refreshProfile:', err);
    }
  };

  useEffect(() => {
    // Get session from local storage
    const getSession = async () => {
      setIsLoading(true);
      try {
        // Use auth service to get session with timeout
        const result = await authService.getSession();
        const { data, error } = result;
        
        if (error) {
          console.error('Error getting session:', error);
          setIsLoading(false);
          return;
        }
        
        const session = data.session;
        setSession(session);
        
        if (session?.user) {
          setUser(session.user);
          
          // Fetch profile data when session is available
          try {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
          } catch (profileError) {
            console.error('Error fetching profile:', profileError);
            // Continue even if profile fetch fails
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (e) {
        console.error('Unexpected error in getSession:', e);
      } finally {
        // Always set isLoading to false, even if there are errors
        setIsLoading(false);
      }
    };

    getSession();

    // Set up a single authStateChange listener
    let subscription: { unsubscribe: () => void } | null = null;
    
    try {
      // This is the ONLY place in the app where we should call onAuthStateChange
      const { data } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          setSession(session);
          
          if (session?.user) {
            setUser(session.user);
            
            // IMPORTANT: Don't call any other Supabase functions inside this callback
            // Instead, set state variables and use them in separate useEffect hooks
            // This prevents the hanging issue with Supabase auth
          } else {
            setUser(null);
            setProfile(null);
          }
          
          setIsLoading(false);
        }
      );
      
      subscription = data.subscription;
    } catch (error) {
      console.error('Error setting up auth state listener:', error);
      setIsLoading(false);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Separate useEffect to handle profile fetching when user changes
  // This prevents making Supabase calls directly in the auth state change handler
  useEffect(() => {
    if (user && !isLoading) {
      const fetchUserProfile = async () => {
        try {
          console.log('Auth state: User logged in, attempting to fetch profile with ID:', user.id);
          
          // First, check if the user can access the profiles table at all
          const { count, error: testError } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .limit(1);
            
          console.log('Test access to profiles table:', count !== null ? 'Success' : 'Failed', testError ? `Error: ${JSON.stringify(testError)}` : '');
          
          const profileData = await fetchProfile(user.id);
          if (profileData) {
            console.log('Profile loaded successfully:', profileData);
            setProfile(profileData);
          } else {
            console.error('Profile loading failed but no error was thrown.');
            
            // Try a more direct approach to fetch the profile
            console.log('Attempting direct profile fetch without using fetchProfile helper');
            const { data: directData, error: directError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();
              
            console.log('Direct profile fetch result:', 
              directData ? 'Found data' : 'No data', 
              directError ? `Error: ${JSON.stringify(directError)}` : 'No error'
            );
            
            if (directData && !directError) {
              console.log('Setting profile from direct query', directData);
              setProfile(directData as Profile);
            }
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      };
      
      fetchUserProfile();
    }
  }, [user, isLoading]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
      setProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    user,
    session,
    profile, // Provide profile in the context
    isLoading,
    signIn,
    signOut,
    refreshProfile, // Provide refresh function
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 