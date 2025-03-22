"use client"

import { useState } from "react"
import { Animal } from "@/components/animals-data-table"
import { AnimalsDataTableWrapper } from "@/components/animals-data-table-wrapper"
import { AnimalDetailSheet } from "@/components/animal-detail-sheet"
import { AddAnimalDialog } from "@/components/add-animal-dialog"
import { EditAnimalDialog } from "@/components/edit-animal-dialog"
import { AddEventDialog } from "@/components/add-event-dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
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
  const [addAnimalDialogOpen, setAddAnimalDialogOpen] = useState(false)
  const [animalToDelete, setAnimalToDelete] = useState<Animal | null>(null)
  const [animalsToDelete, setAnimalsToDelete] = useState<Animal[] | null>(null)
  const [isBatchDelete, setIsBatchDelete] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [addEventDialogOpen, setAddEventDialogOpen] = useState(false)
  
  // Refresh the data after changes
  const handleDataChanged = () => {
    setRefreshKey(prev => prev + 1)
  }
  
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
  
  // Handle delete button click - supports both single and batch delete
  const handleDeleteAnimal = (animal: Animal | Animal[]) => {
    if (Array.isArray(animal)) {
      // Batch delete
      setAnimalsToDelete(animal)
      setIsBatchDelete(true)
    } else {
      // Single delete
      setAnimalToDelete(animal)
      setIsBatchDelete(false)
    }
    setDeleteDialogOpen(true)
  }
  
  // Handle confirming animal deletion
  const confirmDeleteAnimal = async () => {
    try {
      setIsDeleting(true)
      
      if (isBatchDelete && animalsToDelete && animalsToDelete.length > 0) {
        // Get all animal IDs to delete
        const animalIds = animalsToDelete.map(animal => animal.id)
        
        // First check which animals have invoices and can't be deleted
        const { data: animalsWithInvoices, error: checkError } = await supabase
          .from('invoices')
          .select('animal_id')
          .in('animal_id', animalIds)
          .order('animal_id')
        
        if (checkError) throw checkError
        
        // Get unique animal IDs with invoices
        const animalIdsWithInvoices = animalsWithInvoices 
          ? [...new Set(animalsWithInvoices.map(invoice => invoice.animal_id))]
          : []
        
        // Filter animals that can be deleted (no invoices)
        const deletableAnimalIds = animalIds.filter(id => !animalIdsWithInvoices.includes(id))
        const nonDeletableAnimalIds = animalIds.filter(id => animalIdsWithInvoices.includes(id))
        
        if (deletableAnimalIds.length === 0) {
          toast.error('None of the selected animals can be deleted because they have associated invoices.')
          setIsDeleting(false)
          setDeleteDialogOpen(false)
          return
        }
        
        // Delete events for deletable animals first
        const { error: deleteEventsError } = await supabase
          .from('animal_events')
          .delete()
          .in('animal_id', deletableAnimalIds)
        
        if (deleteEventsError) throw deleteEventsError
        
        // Delete only the animals that can be deleted
        const { error } = await supabase
          .from('animals')
          .delete()
          .in('id', deletableAnimalIds)
        
        if (error) throw error
        
        // Prepare the success message
        let successMessage = `${deletableAnimalIds.length} animal(s) deleted successfully`
        if (nonDeletableAnimalIds.length > 0) {
          successMessage += `. ${nonDeletableAnimalIds.length} animal(s) could not be deleted because they have associated invoices.`
        }
        toast.success(successMessage)
      } else if (animalToDelete) {
        // For single animal delete, first check if it has any invoices
        const { data: invoices, error: invoicesError } = await supabase
          .from('invoices')
          .select('id')
          .eq('animal_id', animalToDelete.id)
          .limit(1)
        
        if (invoicesError) throw invoicesError
        
        // If animal has invoices, it can't be deleted
        if (invoices && invoices.length > 0) {
          toast.error(`Cannot delete ${animalToDelete.name} because it has associated invoices.`)
          setIsDeleting(false)
          setDeleteDialogOpen(false)
          return
        }
        
        // Check if animal has any events
        const { data: events, error: eventsError } = await supabase
          .from('animal_events')
          .select('id')
          .eq('animal_id', animalToDelete.id)
          .limit(1)
        
        if (eventsError) throw eventsError
        
        // If animal has events, delete them first
        if (events && events.length > 0) {
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
        
        toast.success(`${animalToDelete.name} deleted successfully`)
      }
      
      // Refresh the animal list
      handleDataChanged()
    } catch (error) {
      console.error("Error deleting animal(s):", error)
      
      // Handle foreign key constraint violation specifically
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23503') {
        toast.error('Some animals could not be deleted because they have associated invoices.')
      } else {
        toast.error(
          error instanceof Error 
            ? `Failed to delete animal(s): ${error.message}`
            : "Failed to delete animal(s). Please try again."
        )
      }
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }
  
  // Handle add animal button click in the UI header
  const handleAddAnimalClick = () => {
    setAddAnimalDialogOpen(true);
  }
  
  // Handle add event for an existing animal
  const handleAddAnimalEvent = (animal: Animal) => {
    setSelectedAnimal(animal)
    setAddEventDialogOpen(true)
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
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-2xl font-bold tracking-tight">Animals</h2>
            <p className="text-muted-foreground">
              Manage your animals and their health records.
            </p>
          </div>
          
          <Button 
            onClick={handleAddAnimalClick}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Animal
          </Button>
        </div>
        
        <div className="w-full overflow-hidden">
          <AnimalsDataTableWrapper 
            key={refreshKey}
            onViewAnimal={handleViewAnimal}
            onEditAnimal={handleEditAnimal}
            onDeleteAnimal={handleDeleteAnimal}
            onAddEvent={handleAddAnimalEvent}
          />
        </div>
        
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
          title={isBatchDelete ? "Delete Multiple Animals" : "Delete Animal"}
          description={isBatchDelete 
            ? `Are you sure you want to delete ${animalsToDelete?.length} selected animals? This will also delete all events and records for these animals. This action cannot be undone.`
            : (animalToDelete 
              ? `Are you sure you want to delete ${animalToDelete.name}? This will also delete all events and records for this animal. This action cannot be undone.`
              : "Are you sure you want to delete this animal? This action cannot be undone."
            )
          }
          entityName={isBatchDelete ? "animals" : "animal"}
        />
        
        <AddAnimalDialog
          open={addAnimalDialogOpen}
          onOpenChange={setAddAnimalDialogOpen}
          onSuccess={handleDataChanged}
        />
        
        {selectedAnimal && (
          <AddEventDialog
            animalId={selectedAnimal.id}
            onSuccess={handleDataChanged}
            open={addEventDialogOpen}
            onOpenChange={setAddEventDialogOpen}
          />
        )}
      </div>
    </DashboardLayout>
  )
} 