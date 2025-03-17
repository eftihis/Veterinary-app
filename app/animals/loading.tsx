import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import DashboardLayout from "../dashboard-layout"

export default function Loading() {
  return (
    <DashboardLayout>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          {/* Placeholder for sidebar trigger */}
          <Skeleton className="h-8 w-8 rounded-md" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          {/* Breadcrumb placeholder */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Page heading skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-4 w-[300px]" />
          </div>
          <Skeleton className="h-9 w-[120px]" />
        </div>
        
        {/* Loading indicator - The DataTableSkeleton is now rendered by the wrapper component */}
        <div className="h-[400px] flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>
      </div>
    </DashboardLayout>
  )
} 