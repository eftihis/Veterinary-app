"use client"

import * as React from "react"
import { ChevronDown, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"

// Animal option type
type AnimalOption = {
  value: string
  label: string
  type?: string
}

// Common props for both versions of the filter
interface AnimalFilterBaseProps {
  animalOptions: AnimalOption[]
  selectedAnimals: string[]
  setSelectedAnimals: React.Dispatch<React.SetStateAction<string[]>>
}

// Props for the dropdown version
interface AnimalFilterDropdownProps extends AnimalFilterBaseProps {
  triggerClassName?: string
}

// Props for the direct version
interface AnimalFilterDirectProps extends AnimalFilterBaseProps {
  className?: string
}

// Export props for the main component that combines both
export interface AnimalFilterProps extends AnimalFilterBaseProps {
  triggerClassName?: string
  className?: string
  variant?: "dropdown" | "direct"
}

// The searchable animal list that's used in both versions
function AnimalList({
  animalOptions,
  selectedAnimals,
  onToggle,
}: {
  animalOptions: AnimalOption[]
  selectedAnimals: string[]
  onToggle: (animalId: string, checked: boolean) => void
}) {
  // Search state for filtering animals
  const [searchQuery, setSearchQuery] = React.useState("")
  
  // Filter animal options based on search query
  const filteredAnimalOptions = React.useMemo(() => {
    if (!searchQuery) return animalOptions;
    return animalOptions.filter(animal => 
      animal.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (animal.type && animal.type.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [animalOptions, searchQuery]);
  
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search patients..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 pl-8"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0.5 top-0.5 h-8 w-8 p-0"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>
      
      <ScrollArea className="h-[220px]">
        <div className="space-y-1">
          {filteredAnimalOptions.length > 0 ? (
            filteredAnimalOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2 rounded-md p-2 hover:bg-accent">
                <Checkbox
                  id={`animal-${option.value}`}
                  checked={selectedAnimals.includes(option.value)}
                  onCheckedChange={(checked) => onToggle(option.value, !!checked)}
                />
                <label
                  htmlFor={`animal-${option.value}`}
                  className="flex-1 text-sm font-medium cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span>{option.label}</span>
                    {option.type && (
                      <span className="text-xs text-muted-foreground capitalize">{option.type}</span>
                    )}
                  </div>
                </label>
              </div>
            ))
          ) : (
            <div className="px-2 py-2 text-sm text-muted-foreground">
              No patients found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// Dropdown version of the filter
export function AnimalFilterDropdown({
  animalOptions,
  selectedAnimals,
  setSelectedAnimals,
  triggerClassName,
}: AnimalFilterDropdownProps) {
  // Keep track of dropdown open state
  const [open, setOpen] = React.useState(false)
  
  // Handle animal toggle without closing the dropdown
  const handleAnimalToggle = (animalId: string, checked: boolean) => {
    if (checked) {
      if (!selectedAnimals.includes(animalId)) {
        setSelectedAnimals(prev => [...prev, animalId])
      }
    } else {
      setSelectedAnimals(prev => prev.filter(id => id !== animalId))
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={`h-9 border-dashed flex gap-1 ${triggerClassName || ''}`}
        >
          <div className="flex gap-1 items-center">
            {selectedAnimals.length > 0 ? (
              <>
                <span>Patient</span>
                <Badge className="ml-1 rounded-sm px-1.5 py-0.5 font-medium bg-secondary text-secondary-foreground">
                  {selectedAnimals.length}
                </Badge>
              </>
            ) : (
              <span>Patient</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel>Filter by patient</DropdownMenuLabel>
        <div className="p-2">
          <AnimalList 
            animalOptions={animalOptions}
            selectedAnimals={selectedAnimals}
            onToggle={handleAnimalToggle}
          />
        </div>
        {selectedAnimals.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelectedAnimals([]);
                setOpen(false); // Close dropdown on clear all
              }}
              className="justify-center text-center"
            >
              Clear filters
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Direct version of the filter for use in drawers/sidebars
export function AnimalFilterDirect({
  animalOptions,
  selectedAnimals,
  setSelectedAnimals,
  className,
}: AnimalFilterDirectProps) {
  // Handle animal toggle
  const handleAnimalToggle = (animalId: string, checked: boolean) => {
    if (checked) {
      if (!selectedAnimals.includes(animalId)) {
        setSelectedAnimals(prev => [...prev, animalId])
      }
    } else {
      setSelectedAnimals(prev => prev.filter(id => id !== animalId))
    }
  }

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between min-h-[32px]">
        <div className="font-medium">Patients</div>
        {selectedAnimals.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setSelectedAnimals([])}
          >
            Clear ({selectedAnimals.length})
          </Button>
        )}
      </div>
      <AnimalList 
        animalOptions={animalOptions}
        selectedAnimals={selectedAnimals}
        onToggle={handleAnimalToggle}
      />
    </div>
  )
}

// Main export that decides which version to use
export function AnimalFilter({
  animalOptions,
  selectedAnimals,
  setSelectedAnimals,
  triggerClassName,
  className,
  variant = "dropdown",
}: AnimalFilterProps) {
  // Return the appropriate version based on the variant prop
  if (variant === "direct") {
    return (
      <AnimalFilterDirect
        animalOptions={animalOptions}
        selectedAnimals={selectedAnimals}
        setSelectedAnimals={setSelectedAnimals}
        className={className}
      />
    );
  }
  
  return (
    <AnimalFilterDropdown
      animalOptions={animalOptions}
      selectedAnimals={selectedAnimals}
      setSelectedAnimals={setSelectedAnimals}
      triggerClassName={triggerClassName}
    />
  );
} 