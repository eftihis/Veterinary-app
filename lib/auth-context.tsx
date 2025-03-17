"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { authService } from './auth-service';

// Add a type for the profile data
type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
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

  // Add a function to fetch profile data
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as Profile;
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      return null;
    }
  };

  // Function to refresh profile data
  const refreshProfile = async () => {
    if (!user) return;
    
    const profileData = await fetchProfile(user.id);
    if (profileData) {
      setProfile(profileData);
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
          const profileData = await fetchProfile(user.id);
          if (profileData) {
            setProfile(profileData);
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