"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

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
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
      }
      
      setSession(session);
      
      if (session?.user) {
        setUser(session.user);
        
        // Fetch profile data when session is available
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      } else {
        setUser(null);
        setProfile(null);
      }
      
      setIsLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        
        if (session?.user) {
          setUser(session.user);
          
          // Fetch profile data when auth state changes
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        } else {
          setUser(null);
          setProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
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