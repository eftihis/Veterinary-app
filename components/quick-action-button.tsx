"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { useState } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { AddAnimalDialog } from "@/components/ui/add-animal-dialog"
import { useRouter } from "next/navigation"

export function QuickActionButton() {
  const router = useRouter()
  const [addAnimalOpen, setAddAnimalOpen] = useState(false)

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+A for Add Animal
      if (e.altKey && e.key === "a") {
        e.preventDefault()
        setAddAnimalOpen(true)
      }
      // Alt+I for Create Invoice
      else if (e.altKey && e.key === "i") {
        e.preventDefault()
        router.push("/add-invoice")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [router])

  const handleAddAnimal = (animalData: any) => {
    // Handle the added animal data if needed
    console.log("Animal added:", animalData)
  }

  return (
    <>
      <div className="fixed bottom-8 right-8 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              className="h-14 w-14 rounded-full bg-black text-white hover:bg-black/90 shadow-lg" 
              size="icon"
            >
              <Plus className="h-6 w-6" />
              <span className="sr-only">Quick Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem 
              onClick={() => setAddAnimalOpen(true)}
              className="cursor-pointer"
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="ml-2 font-medium">Add Animal</div>
              <DropdownMenuShortcut>⌥A</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => router.push("/add-invoice")}
              className="cursor-pointer"
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="ml-2 font-medium">Create Invoice</div>
              <DropdownMenuShortcut>⌥I</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Add Animal Dialog */}
      <AddAnimalDialog
        open={addAnimalOpen}
        onOpenChange={setAddAnimalOpen}
        onAnimalAdded={handleAddAnimal}
      />
    </>
  )
} 