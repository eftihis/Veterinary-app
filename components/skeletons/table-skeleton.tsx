import React from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface TableSkeletonProps {
  /**
   * The number of rows to render in the skeleton table
   */
  rowCount?: number
  /**
   * Whether to show the date filter controls
   */
  showDateFilter?: boolean
  /**
   * Whether to show the status filter
   */
  showStatusFilter?: boolean
  /**
   * Number of columns to show in desktop view
   */
  columnCount?: number
}

export function TableSkeleton({
  rowCount = 8,
  showDateFilter = true,
  showStatusFilter = true,
  columnCount = 6
}: TableSkeletonProps) {
  // This is exactly the structure from the invoices-data-table.tsx, 
  // with the same class names and structure
  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-full md:w-auto relative">
            <Skeleton className="h-10 w-full md:w-[350px]" />
          </div>

          {showDateFilter && (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Skeleton className="h-10 w-full sm:w-[150px] md:w-[180px]" />
              <Skeleton className="h-10 w-full sm:w-[150px] md:w-[180px]" />
            </div>
          )}

          {showStatusFilter && (
            <div className="hidden md:block">
              <Skeleton className="h-10 w-[120px]" />
            </div>
          )}
        </div>

        <div className="self-end">
          <Skeleton className="h-10 w-[130px]" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="rounded-md border w-full min-w-full overflow-hidden">
          <div className="bg-muted/50 border-b">
            <div className="flex p-4 gap-2">
              {Array(columnCount).fill(null).map((_, i) => (
                <Skeleton 
                  key={`header-${i}`} 
                  className={`h-6 ${
                    i === 0 
                      ? 'w-6' 
                      : i === columnCount - 1 
                        ? 'w-8 ml-auto' 
                        : i === 1 
                          ? 'w-32 flex-1' 
                          : 'w-24 flex-1'
                  } ${
                    i > 4 
                      ? 'hidden lg:block' 
                      : i > 2 
                        ? 'hidden md:block' 
                        : i === 2 
                          ? 'hidden sm:block' 
                          : ''
                  }`} 
                />
              ))}
            </div>
          </div>

          <div>
            {Array(rowCount).fill(null).map((_, rowIndex) => (
              <div key={`row-${rowIndex}`} className="flex p-4 border-b items-center gap-2">
                {Array(columnCount).fill(null).map((_, colIndex) => (
                  <Skeleton 
                    key={`cell-${rowIndex}-${colIndex}`} 
                    className={`h-5 ${
                      colIndex === 0 
                        ? 'w-5' 
                        : colIndex === columnCount - 1 
                          ? 'w-8 ml-auto' 
                          : colIndex === 1 
                            ? 'w-32 flex-1' 
                            : colIndex === columnCount - 2 
                              ? 'w-16 flex-1' 
                              : 'w-24 flex-1'
                    } ${
                      colIndex > 4 
                        ? 'hidden lg:block' 
                        : colIndex > 2 
                          ? 'hidden md:block' 
                          : colIndex === 2 
                            ? 'hidden sm:block' 
                            : ''
                    }`} 
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <Skeleton className="h-5 w-36" />
        
        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:gap-6 w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full justify-between sm:w-auto sm:justify-start">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-9 w-[70px]" />
          </div>
          
          <div className="flex items-center gap-2 w-full justify-between sm:w-auto sm:justify-start">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9 hidden sm:block" />
            <Skeleton className="h-9 w-9 hidden sm:block" />
            <Skeleton className="h-9 w-9 hidden sm:block" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </div>
    </div>
  )
} 