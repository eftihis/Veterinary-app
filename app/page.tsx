"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VeterinaryForm from "@/components/veterinary-form";
import { useAuth } from "@/lib/auth-context";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Don't render anything until we're on the client and have checked auth
  if (!isClient || isLoading) {
    return <div className="container max-w-full py-10 px-4">Loading...</div>;
  }

  // If no user, don't render the protected content (we'll redirect in the useEffect)
  if (!user) {
    return null;
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
            <h1 className="text-l font-bold">Veterinary Clinic Invoice</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-15 pb-15">
          <div className="flex justify-center">
            <div className="w-full max-w-4xl">
              <VeterinaryForm />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
