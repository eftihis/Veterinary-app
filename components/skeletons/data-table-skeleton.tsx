import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface DataTableSkeletonProps {
  columnCount?: number;
  rowCount?: number;
  showFilters?: boolean;
  showActionsColumn?: boolean;
}

export function DataTableSkeleton({
  columnCount = 5,
  rowCount = 10,
  showFilters = true,
  showActionsColumn = true,
}: DataTableSkeletonProps) {
  // Adjust column count if actions column is included
  const effectiveColumnCount = showActionsColumn 
    ? columnCount + 1 
    : columnCount;

  return (
    <div className="space-y-4 w-full">
      {/* Table filters skeleton */}
      {showFilters && (
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <Skeleton className="h-9 w-full md:w-[350px]" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      )}

      {/* Table skeleton */}
      <div className="overflow-x-auto">
        <div className="rounded-md border w-full min-w-full overflow-hidden">
          {/* Table header skeleton */}
          <div className="bg-muted/50 border-b">
            <div className="flex p-3 gap-2">
              {Array.from({ length: effectiveColumnCount }).map((_, i) => (
                <Skeleton 
                  key={`header-${i}`} 
                  className={`h-5 ${
                    i === effectiveColumnCount - 1 && showActionsColumn 
                      ? "w-8 ml-auto" 
                      : i === 0 ? "w-6" : "w-24 flex-1"
                  } ${i > 3 ? 'hidden lg:block' : i > 2 ? 'hidden md:block' : ''}`} 
                />
              ))}
            </div>
          </div>

          {/* Table rows skeleton */}
          <div>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <div 
                key={`row-${rowIndex}`} 
                className="flex p-3 border-b items-center gap-2"
              >
                {Array.from({ length: effectiveColumnCount }).map((_, colIndex) => {
                  // Determine if this is the actions column
                  const isActionsColumn = 
                    showActionsColumn && 
                    colIndex === effectiveColumnCount - 1;
                  
                  // Different styling for different columns
                  const isFirstColumn = colIndex === 0;
                  
                  return (
                    <Skeleton 
                      key={`cell-${rowIndex}-${colIndex}`}
                      className={`h-4 ${
                        isActionsColumn
                          ? "w-8 ml-auto"
                          : isFirstColumn
                            ? "w-4"
                            : colIndex === effectiveColumnCount - 2
                              ? "w-16"
                              : "w-24 flex-1"
                      } ${colIndex > 3 ? 'hidden lg:block' : colIndex > 2 ? 'hidden md:block' : ''}`} 
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pagination skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <Skeleton className="h-4 w-36" />
        
        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-[70px]" />
          </div>
          
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8 hidden sm:block" />
            <Skeleton className="h-8 w-8 hidden sm:block" />
            <Skeleton className="h-8 w-8 hidden sm:block" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
    </div>
  );
} 