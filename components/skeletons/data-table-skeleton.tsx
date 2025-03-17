import React from "react";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Table filters skeleton */}
          {showFilters && (
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 py-4">
              <Skeleton className="h-10 w-full md:w-[350px]" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          )}

          {/* Table header skeleton */}
          <div className="rounded-md border">
            <div className="border-b">
              <div className="flex items-center h-10 px-4">
                {Array.from({ length: effectiveColumnCount }).map((_, i) => (
                  <div 
                    key={`header-${i}`} 
                    className={`flex-1 ${
                      i === effectiveColumnCount - 1 && showActionsColumn 
                        ? "w-[100px] flex-none" 
                        : ""
                    }`}
                  >
                    <Skeleton className="h-5 w-[80%]" />
                  </div>
                ))}
              </div>
            </div>

            {/* Table rows skeleton */}
            <div>
              {Array.from({ length: rowCount }).map((_, rowIndex) => (
                <div 
                  key={`row-${rowIndex}`} 
                  className="flex items-center h-16 px-4 border-b last:border-0"
                >
                  {Array.from({ length: effectiveColumnCount }).map((_, colIndex) => {
                    // Determine if this is the actions column
                    const isActionsColumn = 
                      showActionsColumn && 
                      colIndex === effectiveColumnCount - 1;
                    
                    // Different styling for the first column (usually ID or name)
                    const isFirstColumn = colIndex === 0;
                    
                    return (
                      <div 
                        key={`cell-${rowIndex}-${colIndex}`}
                        className={`flex-1 ${
                          isActionsColumn ? "w-[100px] flex-none" : ""
                        }`}
                      >
                        {isActionsColumn ? (
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-8 w-8 rounded-md" />
                            <Skeleton className="h-8 w-8 rounded-md" />
                          </div>
                        ) : (
                          <Skeleton 
                            className={`${
                              isFirstColumn 
                                ? "h-5 w-[120px]" 
                                : "h-5 w-[80%] max-w-[180px]"
                            }`} 
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Pagination skeleton */}
          <div className="flex items-center justify-between py-4">
            <Skeleton className="h-5 w-[180px]" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 