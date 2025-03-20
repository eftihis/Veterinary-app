"use client";

import { useState, useEffect } from "react";
import { DataTableSkeleton } from "@/components/skeletons/data-table-skeleton";
import { InvoicesDataTable, Invoice } from "@/components/invoices-data-table";
import { supabase } from "@/lib/supabase";

// Define proper types for local use
interface Veterinarian {
  id: string;
  first_name: string;
  last_name: string;
}

interface RawInvoice {
  id: string;
  document_number: string;
  reference?: string | null;
  animal_id?: string | null;
  veterinarian_id?: string | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  subtotal: number;
  discount_total: number;
  total: number;
  status: string;
  created_at: string;
  animals?: {
    id: string;
    name: string;
    type: string;
  } | Array<{
    id: string;
    name: string;
    type: string;
  }> | null;
}

interface InvoicesDataTableWrapperProps {
  onDeleteInvoice?: (invoice: Invoice | Invoice[]) => void;
  onUpdateInvoiceStatus?: (invoices: Invoice[], newStatus: string) => void;
}

export default function InvoicesDataTableWrapper({
  onDeleteInvoice,
  onUpdateInvoiceStatus,
}: InvoicesDataTableWrapperProps = {}) {
  const [isLoading, setIsLoading] = useState(true);
  const [preloadedInvoices, setPreloadedInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Ensure minimum loading time for better UX
        const minLoadingTime = 800;
        const startTime = Date.now();
        
        // Build select query for invoices with all needed fields
        const selectQuery = `
          id, 
          document_number, 
          reference, 
          animal_id,
          veterinarian_id,
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
        
        console.log("Fetched raw invoice data:", data);
        
        // Get all veterinarian IDs to fetch their data
        const veterinarianIds = data
          .map((invoice: RawInvoice) => invoice.veterinarian_id)
          .filter((id: string | null | undefined) => id !== null && id !== undefined);
        
        console.log("Veterinarian IDs found in wrapper:", veterinarianIds);
        
        // Create a map to store veterinarian data
        let veterinarians: {[key: string]: Veterinarian} = {};
        
        // If we have veterinarian IDs, fetch their data
        if (veterinarianIds.length > 0) {
          const { data: vetsData, error: vetsError } = await supabase
            .from('contacts')
            .select('id, first_name, last_name')
            .in('id', veterinarianIds);
          
          console.log("Veterinarian data fetched from contacts in wrapper:", vetsData);
          
          if (vetsError) {
            console.error("Error fetching veterinarians in wrapper:", vetsError);
          } else if (vetsData) {
            // Convert to a lookup object
            veterinarians = vetsData.reduce((acc: {[key: string]: Veterinarian}, vet: Veterinarian) => {
              acc[vet.id] = vet;
              return acc;
            }, {});
            
            console.log("Veterinarians lookup object in wrapper:", veterinarians);
          }
        }
        
        // Process data similar to how InvoicesDataTable would
        const processedData = (data || []).map((invoice: RawInvoice) => {
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
              const animalObj = invoice.animals as {id: string; name: string; type: string};
              animalData = {
                id: animalObj.id || "",
                name: animalObj.name || "",
                type: animalObj.type || ""
              };
            }
          }
          
          // Get veterinarian data from our lookup
          let veterinarianData = null;
          if (invoice.veterinarian_id && veterinarians[invoice.veterinarian_id]) {
            const vet = veterinarians[invoice.veterinarian_id];
            veterinarianData = {
              id: vet.id,
              first_name: vet.first_name,
              last_name: vet.last_name
            };
            console.log(`Assigned veterinarian to invoice ${invoice.document_number} in wrapper:`, veterinarianData);
          } else if (invoice.veterinarian_id) {
            console.log(`Veterinarian ID ${invoice.veterinarian_id} found in invoice ${invoice.document_number} but no matching contact data (wrapper).`);
          }
          
          return {
            ...invoice,
            animal: animalData,
            veterinarian: veterinarianData,
            subtotal: invoice.subtotal || 0,
            discount_total: invoice.discount_total || 0,
            total: invoice.total || 0
          };
        });
        
        console.log("Processed invoices with veterinarian data in wrapper:", 
          processedData.slice(0, 3).map(invoice => ({
            document_number: invoice.document_number,
            veterinarian_id: invoice.veterinarian_id,
            veterinarian: invoice.veterinarian
          }))
        );
        
        // Calculate remaining time to meet minimum loading time
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
        
        // Wait the remaining time if needed
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
        
        // Set data and finish loading
        setPreloadedInvoices(processedData as Invoice[]);
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
    onDeleteInvoice={onDeleteInvoice}
    onUpdateInvoiceStatus={onUpdateInvoiceStatus}
  />;
} 