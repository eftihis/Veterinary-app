"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/lib/auth-context";

export function ProfileInitializer({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { ensureProfileExists } = useProfile();
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    // Only run this once when auth is loaded and we have a user
    if (!isLoading && user && !profileChecked) {
      const checkProfile = async () => {
        try {
          console.log("Checking if profile exists for user:", user.id);
          await ensureProfileExists();
          setProfileChecked(true);
        } catch (error) {
          console.error("Error checking profile:", error);
        }
      };

      checkProfile();
    }
  }, [user, isLoading, profileChecked, ensureProfileExists]);

  return <>{children}</>;
} 