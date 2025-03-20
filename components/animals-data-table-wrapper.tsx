"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Animal, AnimalsDataTable } from "@/components/animals-data-table"
import { DataTableSkeleton } from "@/components/skeletons/data-table-skeleton"
import { Button } from "@/components/ui/button"

interface AnimalsDataTableWrapperProps {
  onViewAnimal: (animal: Animal) => void
  onEditAnimal?: (animal: Animal) => void
  onDeleteAnimal?: (animal: Animal) => void
  onAddEvent?: (animal: Animal) => void
}

export function AnimalsDataTableWrapper({
  onViewAnimal,
  onEditAnimal = () => {},
  onDeleteAnimal = () => {},
  onAddEvent,
}: AnimalsDataTableWrapperProps) {
  const [animals, setAnimals] = useState<Animal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    fetchAnimals()
    
    // Add event listener for refreshing the table
    const handleRefreshTable = () => {
      console.log("Received refreshAnimalsTable event, refreshing data...");
      fetchAnimals();
    };
    
    // Listen for the custom refresh event
    window.addEventListener('refreshAnimalsTable', handleRefreshTable);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('refreshAnimalsTable', handleRefreshTable);
    };
  }, [])
  
  async function fetchAnimals() {
    try {
      setLoading(true)
      setError(null)
      
      // Ensure minimum loading time for better UX
      const minLoadingTime = 800
      const startTime = Date.now()
      
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      // Calculate remaining time to meet minimum loading time
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime)
      
      // Wait the remaining time if needed
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime))
      }
      
      setAnimals(data || [])
    } catch (err) {
      console.error("Error fetching animals:", err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    // Show skeleton with appropriate column count for animals table
    return <DataTableSkeleton columnCount={6} rowCount={8} />
  }
  
  if (error) {
    return (
      <div className="rounded-md border border-red-500 p-4 my-4 bg-red-50">
        <p className="text-red-600">Error loading animals: {error}</p>
        <Button 
          onClick={fetchAnimals} 
          variant="outline" 
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    )
  }
  
  return (
    <AnimalsDataTable
      data={animals}
      onViewAnimal={onViewAnimal}
      onEditAnimal={onEditAnimal}
      onDeleteAnimal={onDeleteAnimal}
      onAddEvent={onAddEvent}
    />
  )
} 