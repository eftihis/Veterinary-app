import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export function ProfileSkeleton() {
  return (
    <>
      <div className="mb-8">
        <Skeleton className="h-9 w-52 mb-2" />
        <Skeleton className="h-5 w-80" />
      </div>

      <div className="grid gap-8">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" disabled>Profile</TabsTrigger>
            <TabsTrigger value="password" disabled>Password</TabsTrigger>
          </TabsList>
          
          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle><Skeleton className="h-6 w-48" /></CardTitle>
                <CardDescription>
                  <Skeleton className="h-4 w-72" />
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-4 w-56" />
                  </div>
                </div>

                {/* Divider */}
                <Skeleton className="h-[1px] w-full" />

                {/* Form Fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Skeleton className="h-10 w-32" />
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Password Tab - Hidden in skeleton */}
        </Tabs>
      </div>
    </>
  );
} 