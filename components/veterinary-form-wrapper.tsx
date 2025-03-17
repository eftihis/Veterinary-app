"use client";

import { useState, useEffect } from "react";
import VeterinaryForm from "@/components/veterinary-form";
import { VeterinaryFormSkeleton } from "@/components/skeletons/veterinary-form-skeleton";
import { useXeroItems } from "@/hooks/useXeroItems";
import { useAnimals } from "@/hooks/useAnimals";

export default function VeterinaryFormWrapper() {
  const [isLoading, setIsLoading] = useState(true);
  
  // Get the Xero items and animals data
  const { loading: loadingXeroItems } = useXeroItems();
  const { loading: loadingAnimals } = useAnimals();
  
  useEffect(() => {
    // Create a timeout to handle minimum loading time
    // This prevents flickering for fast connections
    const timer = setTimeout(() => {
      if (!loadingXeroItems && !loadingAnimals) {
        setIsLoading(false);
      }
    }, 800); // Show skeleton for at least 800ms to prevent flash
    
    return () => clearTimeout(timer);
  }, [loadingXeroItems, loadingAnimals]);
  
  // If we're still loading data for the form, show skeleton
  if (isLoading) {
    return <VeterinaryFormSkeleton />;
  }
  
  // Otherwise, render the actual form
  return <VeterinaryForm />;
} 