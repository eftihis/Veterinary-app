import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ProfileContentWrapper } from "@/components/profile-content-wrapper";

export default function ProfilesPage() {
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
            <div className="w-full max-w-3xl py-8">
              <ProfileContentWrapper />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 