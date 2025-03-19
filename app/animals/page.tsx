"use client"

import { useState } from "react"
import { Animal } from "@/components/animals-data-table"
import { AnimalsDataTableWrapper } from "@/components/animals-data-table-wrapper"
import { AnimalDetailSheet } from "@/components/animal-detail-sheet"
import { AddAnimalDialog } from "@/components/add-animal-dialog"
import { EditAnimalDialog } from "@/components/edit-animal-dialog"
import { AddEventDialog } from "@/components/add-event-dialog"
import { Button } from "@/components/ui/button"
import { Dog, Plus } from "lucide-react"
import DashboardLayout from "../dashboard-layout"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function AnimalsPage() {
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null)
  const [addEventDialogOpen, setAddEventDialogOpen] = useState(false)
  const [animalToDelete, setAnimalToDelete] = useState<Animal | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Open detail sheet when an animal is clicked
  const handleViewAnimal = (animal: Animal) => {
    setSelectedAnimalId(animal.id)
    setDetailSheetOpen(true)
  }
  
  // Handle edit button click
  const handleEditAnimal = (animal: Animal) => {
    setSelectedAnimal(animal)
    setEditDialogOpen(true)
  }
  
  // Handle delete button click
  const handleDeleteAnimal = (animal: Animal) => {
    setAnimalToDelete(animal)
    setDeleteDialogOpen(true)
  }
  
  // Handle confirming animal deletion
  const confirmDeleteAnimal = async () => {
    if (!animalToDelete) return
    
    try {
      setIsDeleting(true)
      
      // Check if animal has any events
      const { data: events, error: eventsError } = await supabase
        .from('animal_events')
        .select('id')
        .eq('animal_id', animalToDelete.id)
        .limit(1)
      
      if (eventsError) throw eventsError
      
      // If animal has events, ask for confirmation to delete them too
      if (events && events.length > 0) {
        // Delete all related events first
        const { error: deleteEventsError } = await supabase
          .from('animal_events')
          .delete()
          .eq('animal_id', animalToDelete.id)
        
        if (deleteEventsError) throw deleteEventsError
      }
      
      // Delete the animal
      const { error } = await supabase
        .from('animals')
        .delete()
        .eq('id', animalToDelete.id)
      
      if (error) throw error
      
      toast.success("Animal deleted successfully")
      
      // Refresh the animal list
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      console.error("Error deleting animal:", error)
      toast.error(
        error instanceof Error 
          ? `Failed to delete animal: ${error.message}`
          : "Failed to delete animal. Please try again."
      )
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }
  
  // Handle add event button click
  const handleAddEvent = (animal: Animal) => {
    setSelectedAnimal(animal)
    // Trigger the hidden button click
    setTimeout(() => {
      const triggerButton = document.getElementById('add-event-trigger');
      if (triggerButton) {
        triggerButton.click();
      }
    }, 0);
  }
  
  // Refresh the data after changes
  const handleDataChanged = () => {
    setRefreshKey(prev => prev + 1)
  }
  
  return (
    <DashboardLayout>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Animals</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-2xl font-bold tracking-tight">Animals</h2>
            <p className="text-muted-foreground">
              Manage your animals and their records.
            </p>
          </div>
          
          <AddAnimalDialog onSuccess={handleDataChanged}>
            <Button size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Animal
            </Button>
          </AddAnimalDialog>
        </div>
        
        <AnimalsDataTableWrapper 
          key={refreshKey}
          onViewAnimal={handleViewAnimal}
          onEditAnimal={handleEditAnimal}
          onAddEvent={handleAddEvent}
          onDeleteAnimal={handleDeleteAnimal}
        />
        
        <AnimalDetailSheet
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          animalId={selectedAnimalId}
          onEdit={handleEditAnimal}
        />
        
        <EditAnimalDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          animal={selectedAnimal}
          onAnimalUpdated={handleDataChanged}
        />
        
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDeleteAnimal}
          isDeleting={isDeleting}
          title="Delete Animal"
          description={animalToDelete 
            ? `Are you sure you want to delete ${animalToDelete.name}? This will also delete all events and records for this animal. This action cannot be undone.`
            : "Are you sure you want to delete this animal? This action cannot be undone."
          }
          entityName="animal"
        />
        
        {selectedAnimal && (
          <AddEventDialog
            animalId={selectedAnimal.id}
            onSuccess={handleDataChanged}
          >
            <Button
              id="add-event-trigger"
              className="hidden"
              variant="outline"
            >
              Add Event
            </Button>
          </AddEventDialog>
        )}
      </div>
    </DashboardLayout>
  )
} 