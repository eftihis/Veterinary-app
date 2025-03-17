"use client";

import { useState, useEffect } from "react";
import { DataTableSkeleton } from "@/components/skeletons/data-table-skeleton";
import { InvoicesDataTable } from "@/components/invoices-data-table";
import { Card, CardContent } from "@/components/ui/card";

export default function InvoicesDataTableWrapper() {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate loading delay to show skeleton
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (isLoading) {
    // Show skeleton with appropriate column count for invoices table
    return <DataTableSkeleton columnCount={7} rowCount={8} />;
  }
  
  // Once loaded, show the actual data table
  return <InvoicesDataTable />;
} 