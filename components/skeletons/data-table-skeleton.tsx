import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface DataTableSkeletonProps {
  columnCount?: number;
  rowCount?: number;
  showFilters?: boolean;
  showActionsColumn?: boolean;
  showDateFilter?: boolean;
  showStatusFilter?: boolean; 
  showAnimalFilter?: boolean;
  showContactFilter?: boolean;
  showItemFilter?: boolean;
}

export function DataTableSkeleton({
  columnCount = 5,
  rowCount = 10,
  showFilters = true,
  showActionsColumn = true,
  showDateFilter = true,
  showStatusFilter = true,
  showAnimalFilter = false,
  showContactFilter = false,
  showItemFilter = false
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
          <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
            {/* Search input */}
            <Skeleton className="h-10 w-full md:w-[350px]" />
            
            {/* Date filters */}
            {showDateFilter && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-2 md:mt-0">
                <Skeleton className="h-10 w-full sm:w-[150px] md:w-[180px]" />
                <Skeleton className="h-10 w-full sm:w-[150px] md:w-[180px]" />
              </div>
            )}
            
            {/* Status filter */}
            {showStatusFilter && (
              <div className="hidden md:flex md:items-center">
                <Skeleton className="h-10 w-[120px]" />
              </div>
            )}
            
            {/* Item filter */}
            {showItemFilter && (
              <div className="hidden md:flex md:items-center">
                <Skeleton className="h-10 w-[120px]" />
              </div>
            )}
            
            {/* Animal filter */}
            {showAnimalFilter && (
              <div className="hidden md:flex md:items-center">
                <Skeleton className="h-10 w-[120px]" />
              </div>
            )}
            
            {/* Contact filter */}
            {showContactFilter && (
              <div className="hidden md:flex md:items-center">
                <Skeleton className="h-10 w-[120px]" />
              </div>
            )}
          </div>
          <div className="self-end mt-2 md:mt-0">
            <Skeleton className="h-10 w-[130px]" />
          </div>
        </div>
      )}

      {/* Table skeleton */}
      <div className="overflow-x-auto">
        <div className="rounded-md border w-full min-w-full overflow-hidden">
          {/* Table header skeleton */}
          <div className="bg-muted/50 border-b">
            <div className="flex p-4 gap-2">
              {Array.from({ length: effectiveColumnCount }).map((_, i) => (
                <Skeleton 
                  key={`header-${i}`} 
                  className={`h-6 ${
                    i === 0 
                      ? 'w-6' 
                      : i === effectiveColumnCount - 1 && showActionsColumn 
                        ? 'w-10 ml-auto' 
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

          {/* Table rows skeleton */}
          <div>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <div 
                key={`row-${rowIndex}`} 
                className="flex p-4 border-b items-center gap-2"
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
                      className={`h-5 ${
                        isActionsColumn
                          ? 'w-10 ml-auto'
                          : isFirstColumn
                            ? 'w-5'
                            : colIndex === 1
                              ? 'w-32 flex-1'
                              : colIndex === effectiveColumnCount - 2
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
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pagination skeleton */}
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
  );
} 