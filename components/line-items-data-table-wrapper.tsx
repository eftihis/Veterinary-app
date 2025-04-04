"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTableSkeleton } from "@/components/skeletons/data-table-skeleton";
import { LineItemsDataTable, LineItem } from "@/components/line-items-data-table";
import { supabase } from "@/lib/supabase";

export default function LineItemsDataTableWrapper() {
  const [isLoading, setIsLoading] = useState(true);
  const [preloadedLineItems, setPreloadedLineItems] = useState<LineItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInitialRender, setIsInitialRender] = useState(true);
  
  const fetchData = useCallback(async () => {
    try {
      // Ensure minimum loading time for better UX
      const minLoadingTime = 300; // Reduced for smoother experience
      const startTime = Date.now();
      
      // Fetch the actual full data set from line_items_view
      const { data, error } = await supabase
        .from('line_items_view')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      // Calculate remaining time to meet minimum loading time
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
      
      // Wait the remaining time if needed
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      // Set data and finish loading
      setPreloadedLineItems(data || []);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      // Even on error, finish loading after a delay
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    // Only fetch data after the component is mounted
    if (typeof window !== 'undefined') {
      setIsInitialRender(false);
      fetchData();
    }
  }, [fetchData]);
  
  // During the initial dynamic import loading phase, don't render anything additional
  // This helps avoid double-skeleton rendering since dynamic import's loading prop shows the skeleton
  if (isInitialRender) {
    return null;
  }
  
  if (isLoading) {
    // Hidden during initial load, but used when refetching data
    return <DataTableSkeleton 
      columnCount={7} 
      rowCount={8} 
      showFilters={true}
      showDateFilter={true}
      showStatusFilter={true}
      showAnimalFilter={true}
      showContactFilter={true}
      showItemFilter={true}
    />;
  }
  
  if (error) {
    return (
      <div className="rounded-md border border-red-500 p-4 my-4 bg-red-50">
        <p className="text-red-600">Error loading line items: {error}</p>
      </div>
    );
  }
  
  // Once loaded, show the actual data table with preloaded data
  return <LineItemsDataTable 
    skipLoadingState={true} 
    initialFetchComplete={true}
    preloadedData={preloadedLineItems}
  />;
} 