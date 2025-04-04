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
  return (
    <div className="space-y-4 w-full">
      {/* Simplified table filters row */}
      {showFilters && (
        <div className="flex flex-col gap-4 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Search input */}
              <Skeleton className="h-9 w-[350px]" />
              {/* Filter button */}
              <Skeleton className="h-9 w-[80px]" />
            </div>
            
            <div className="flex items-center gap-5">
              {/* Columns visibility toggle */}
              <Skeleton className="h-9 w-[120px]" />
            </div>
          </div>
        </div>
      )}

      {/* Table skeleton */}
      <div className="rounded-md border overflow-hidden">
        <div className="w-full overflow-auto">
          {/* Table header skeleton */}
          <div className="bg-muted/50">
            <div className="flex p-4 gap-4">
              {/* Checkbox column */}
              <Skeleton className="h-4 w-4 rounded" />
              
              {/* Data columns */}
              {Array.from({ length: columnCount }).map((_, i) => (
                <Skeleton 
                  key={`header-${i}`} 
                  className={`h-5 ${
                    i === 0 
                      ? 'w-[180px] flex-1' 
                      : i === columnCount - 1 && showActionsColumn 
                        ? 'w-16 ml-auto' 
                        : 'w-32 flex-1'
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
              
              {/* Actions column */}
              {showActionsColumn && (
                <Skeleton className="h-5 w-10 ml-auto" />
              )}
            </div>
          </div>

          {/* Table rows skeleton */}
          <div>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <div 
                key={`row-${rowIndex}`} 
                className="flex p-4 border-t items-center gap-4"
              >
                {/* Checkbox */}
                <Skeleton className="h-4 w-4 rounded" />
                
                {/* Data cells */}
                {Array.from({ length: columnCount }).map((_, colIndex) => {
                  // Different styling for different columns
                  let width = 'w-32 flex-1';
                  
                  if (colIndex === 0) {
                    width = 'w-[180px] flex-1';
                  } else if (colIndex === 1) {
                    width = 'w-40 flex-1';
                  } else if (colIndex === columnCount - 1) {
                    width = 'w-24 flex-1';
                  }
                  
                  const visibility = 
                    colIndex > 4 
                      ? 'hidden lg:block' 
                      : colIndex > 2 
                        ? 'hidden md:block' 
                        : colIndex === 2 
                          ? 'hidden sm:block' 
                          : '';
                  
                  return (
                    <Skeleton 
                      key={`cell-${rowIndex}-${colIndex}`}
                      className={`h-5 ${width} ${visibility}`} 
                    />
                  );
                })}
                
                {/* Actions column */}
                {showActionsColumn && (
                  <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Simplified pagination skeleton */}
      <div className="flex items-center justify-between py-2">
        <Skeleton className="h-5 w-36" />
        
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
    </div>
  );
} 