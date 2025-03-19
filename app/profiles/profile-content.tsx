"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import UserProfile from "@/components/profile";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function ProfileContent() {
  const { user, profile, isLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  // Handle hydration and auth state
  useEffect(() => {
    setIsMounted(true);
    
    // Check if user is logged in after auth state has loaded
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  // Prevent hydration mismatch by not rendering anything on first render
  if (!isMounted) {
    return null;
  }

  // Show loading state while auth is being checked
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // If no user after loading, don't render the protected content
  if (!user) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="grid gap-8">
        {profile ? (
          <UserProfile
            initialFullName={profile.display_name || ""}
            initialEmail={profile.email}
            avatarUrl={profile.avatar_url || "/placeholder.svg"}
            role="User"
            onProfileUpdate={refreshProfile}
          />
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center p-6">
              <p className="text-muted-foreground">
                Profile data could not be loaded. Please try again later.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
} 