"use client";

import { useState, useEffect } from "react";
import { DataTableSkeleton } from "@/components/skeletons/data-table-skeleton";
import { LineItemsDataTable, LineItem } from "@/components/line-items-data-table";
import { supabase } from "@/lib/supabase";

export default function LineItemsDataTableWrapper() {
  const [isLoading, setIsLoading] = useState(true);
  const [preloadedLineItems, setPreloadedLineItems] = useState<LineItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Ensure minimum loading time for better UX
        const minLoadingTime = 800;
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
        setTimeout(() => setIsLoading(false), 800);
      }
    };
    
    fetchData();
  }, []);
  
  if (isLoading) {
    // Show skeleton with appropriate column count for line items table
    return <DataTableSkeleton columnCount={7} rowCount={8} />;
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