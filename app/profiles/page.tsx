"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import UserProfile from "@/components/profile";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";

export default function ProfilesPage() {
  const { user, profile, isLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    if (!isLoading && !user) {
      router.push("/login");
    } else if (!isLoading && user) {
      setPageLoading(false);
    }
  }, [user, isLoading, router]);

  if (isLoading || pageLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <h1 className="text-l font-bold">Account Settings</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-15 pb-15">
          <div className="flex justify-center">
            <div className="w-full max-w-4xl py-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
                <p className="text-muted-foreground">
                  Manage your account settings and preferences.
                </p>
              </div>

              <div className="grid gap-8">
                {profile ? (
                  <UserProfile
                    initialFullName={profile.full_name || ""}
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
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 