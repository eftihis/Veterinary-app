"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ProfileSkeleton() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="grid gap-8">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <Card className="border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Profile Information</CardTitle>
                <CardDescription>
                  Update your account information and how your profile appears
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar - Match the exact size as the real component */}
                <div className="flex flex-col items-center md:flex-row md:items-start gap-6 pb-6 border-b">
                  <Skeleton className="h-24 w-24 md:h-28 md:w-28 rounded-full" />
                  <div className="flex flex-col gap-1 text-center md:text-left">
                    <Skeleton className="h-6 w-40 mb-1" />
                    <Skeleton className="h-4 w-32 mb-3" />
                    <Skeleton className="h-8 w-28" />
                  </div>
                </div>

                {/* Form fields */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-10 w-full" />
                </div>

                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-3 w-64 mt-1" />
                </div>

                <Skeleton className="h-10 w-32 mt-6" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
} 