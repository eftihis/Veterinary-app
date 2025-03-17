"use client";

import { useState, useEffect } from "react";
import { DataTableSkeleton } from "@/components/skeletons/data-table-skeleton";
import { InvoicesDataTable } from "@/components/invoices-data-table";
import { supabase } from "@/lib/supabase";

export default function InvoicesDataTableWrapper() {
  const [isLoading, setIsLoading] = useState(true);
  const [preloadedInvoices, setPreloadedInvoices] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Ensure minimum loading time for better UX
        const minLoadingTime = 800;
        const startTime = Date.now();
        
        // Build select query for invoices with all needed fields
        let selectQuery = `
          id, 
          document_number, 
          reference, 
          animal_id,
          check_in_date, 
          check_out_date, 
          subtotal, 
          discount_total, 
          total, 
          status, 
          created_at,
          animals!left(id, name, type)
        `;
        
        // Fetch the actual full data set
        const { data, error } = await supabase
          .from('invoices')
          .select(selectQuery)
          .order('created_at', { ascending: false });
          
        if (error) {
          throw error;
        }
        
        // Process data similar to how InvoicesDataTable would
        const processedData = (data || []).map((invoice: any) => {
          // Handle the animals property
          let animalData = null;
          if (invoice.animals) {
            // If it's an array with elements, use the first one
            if (Array.isArray(invoice.animals) && invoice.animals.length > 0) {
              animalData = {
                id: invoice.animals[0].id || "",
                name: invoice.animals[0].name || "",
                type: invoice.animals[0].type || ""
              };
            } 
            // If it's a single object (not in an array)
            else if (typeof invoice.animals === 'object' && invoice.animals !== null) {
              animalData = {
                id: invoice.animals.id || "",
                name: invoice.animals.name || "",
                type: invoice.animals.type || ""
              };
            }
          }
          
          return {
            ...invoice,
            animal: animalData,
            subtotal: invoice.subtotal || 0,
            discount_total: invoice.discount_total || 0,
            total: invoice.total || 0
          };
        });
        
        // Calculate remaining time to meet minimum loading time
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
        
        // Wait the remaining time if needed
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
        
        // Set data and finish loading
        setPreloadedInvoices(processedData);
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
    // Show skeleton with appropriate column count for invoices table
    return <DataTableSkeleton columnCount={7} rowCount={8} />;
  }
  
  if (error) {
    return (
      <div className="rounded-md border border-red-500 p-4 my-4 bg-red-50">
        <p className="text-red-600">Error loading invoices: {error}</p>
      </div>
    );
  }
  
  // Once loaded, show the actual data table with preloaded data
  return <InvoicesDataTable 
    skipLoadingState={true} 
    initialFetchComplete={true}
    preloadedData={preloadedInvoices}
  />;
} 