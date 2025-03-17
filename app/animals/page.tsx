"use client"

import { useState } from "react"
import { Animal } from "@/components/animals-data-table"
import { AnimalsDataTableWrapper } from "@/components/animals-data-table-wrapper"
import { AnimalDetailSheet } from "@/components/animal-detail-sheet"
import { AddAnimalDialog } from "@/components/add-animal-dialog"
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

export default function AnimalsPage() {
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Open detail sheet when an animal is clicked
  const handleViewAnimal = (animal: Animal) => {
    setSelectedAnimalId(animal.id)
    setDetailSheetOpen(true)
  }
  
  // Refresh the data table when an animal is added
  const handleAnimalAdded = () => {
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
          
          <AddAnimalDialog onSuccess={handleAnimalAdded}>
            <Button size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Animal
            </Button>
          </AddAnimalDialog>
        </div>
        
        <AnimalsDataTableWrapper 
          key={refreshKey}
          onViewAnimal={handleViewAnimal}
        />
        
        <AnimalDetailSheet
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          animalId={selectedAnimalId}
        />
      </div>
    </DashboardLayout>
  )
} 