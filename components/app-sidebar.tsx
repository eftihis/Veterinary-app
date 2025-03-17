"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Receipt,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

// This is sample data.
const data = {
  teams: [
    {
      name: "PAWS",
      logo: GalleryVerticalEnd,
      plan: "Animal Welfare Society",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: PieChart,
      items: [
        {
          title: "Overview",
          url: "/dashboard",
        },
        {
          title: "Analytics",
          url: "/dashboard/analytics",
        },
      ],
    },
    {
      title: "Veterinary Form",
      url: "/veterinary-form",
      icon: BookOpen,
      items: [
        {
          title: "Create New Form",
          url: "/veterinary-form",
        },
        {
          title: "View Forms",
          url: "/veterinary-forms",
        },
      ],
    },
    {
      title: "Records",
      url: "/records",
      icon: Receipt,
      items: [
        {
          title: "Patients",
          url: "/records/patients",
        },
        {
          title: "Treatments",
          url: "/line-items",
        },
      ],
    },
    {
      title: "Invoices",
      url: "/invoices",
      icon: Receipt,
      items: [
        {
          title: "View All",
          url: "/invoices",
        },
        {
          title: "Create New",
          url: "/invoices/new",
        },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "/settings",
        },
        {
          title: "Appearance",
          url: "/settings/appearance",
        },
        {
          title: "Notifications",
          url: "/settings/notifications",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  // Create user object with the format NavUser expects
  const userData = user ? {
    name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    avatar: profile?.avatar_url || user.user_metadata?.avatar_url || '/placeholder.svg',
  } : {
    name: 'User',
    email: '',
    avatar: '/placeholder.svg',
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} onSignOut={handleSignOut} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
