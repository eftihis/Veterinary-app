"use client"

import * as React from "react"
import { ChevronDown, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

// Animal option type
type AnimalOption = {
  value: string
  label: string
  type?: string
}

// Props for the AnimalFilter component
interface AnimalFilterProps {
  animalOptions: AnimalOption[]
  selectedAnimals: string[]
  setSelectedAnimals: React.Dispatch<React.SetStateAction<string[]>>
}

export function AnimalFilter({
  animalOptions,
  selectedAnimals,
  setSelectedAnimals,
}: AnimalFilterProps) {
  // Keep track of dropdown open state
  const [open, setOpen] = React.useState(false)
  
  // Search state for filtering animals in dropdown
  const [searchQuery, setSearchQuery] = React.useState("")
  
  // Handle animal toggle without closing the dropdown
  const handleAnimalToggle = (animalId: string, checked: boolean) => {
    if (checked) {
      if (!selectedAnimals.includes(animalId)) {
        setSelectedAnimals(prev => [...prev, animalId])
      }
    } else {
      setSelectedAnimals(prev => prev.filter(id => id !== animalId))
    }
    // Do not close the dropdown after selection
  }
  
  // Filter animal options based on search query
  const filteredAnimalOptions = React.useMemo(() => {
    if (!searchQuery) return animalOptions;
    return animalOptions.filter(animal => 
      animal.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (animal.type && animal.type.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [animalOptions, searchQuery]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 border-dashed flex gap-1 min-w-[120px]">
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
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel>Filter by patient</DropdownMenuLabel>
        <div className="px-2 py-2">
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
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {filteredAnimalOptions.length > 0 ? (
            filteredAnimalOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={selectedAnimals.includes(option.value)}
                onCheckedChange={(checked: boolean) => 
                  handleAnimalToggle(option.value, checked)
                }
                onSelect={(e) => {
                  e.preventDefault();
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">{option.label}</div>
                  {option.type && (
                    <div className="text-xs text-muted-foreground capitalize">{option.type}</div>
                  )}
                </div>
              </DropdownMenuCheckboxItem>
            ))
          ) : (
            <div className="px-2 py-2 text-sm text-muted-foreground">
              No patients found
            </div>
          )}
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