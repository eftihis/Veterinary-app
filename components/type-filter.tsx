"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

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

// Type option definition
type TypeOption = {
  value: string
  label: string
}

// Props for the TypeFilter component
interface TypeFilterProps {
  typeOptions: TypeOption[]
  selectedTypes: string[]
  setSelectedTypes: React.Dispatch<React.SetStateAction<string[]>>
}

export function TypeFilter({
  typeOptions,
  selectedTypes,
  setSelectedTypes,
}: TypeFilterProps) {
  // Keep track of dropdown open state
  const [open, setOpen] = React.useState(false)
  
  // Handle type toggle without closing the dropdown
  const handleTypeToggle = (type: string, checked: boolean) => {
    if (checked) {
      if (!selectedTypes.includes(type)) {
        setSelectedTypes(prev => [...prev, type])
      }
    } else {
      setSelectedTypes(prev => prev.filter(t => t !== type))
    }
    // Do not close the dropdown after selection
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 border-dashed flex gap-1 min-w-[120px]">
          <div className="flex gap-1 items-center">
            {selectedTypes.length > 0 ? (
              <>
                <span>Type</span>
                <Badge className="ml-1 rounded-sm px-1.5 py-0.5 font-medium bg-secondary text-secondary-foreground">
                  {selectedTypes.length}
                </Badge>
              </>
            ) : (
              <span>Type</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>Filter by animal type</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {typeOptions.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selectedTypes.includes(option.value)}
            onCheckedChange={(checked: boolean) => 
              handleTypeToggle(option.value, checked)
            }
            onSelect={(e) => {
              e.preventDefault();
            }}
          >
            <div className="flex items-center gap-2">
              <div className="flex-1">{option.label}</div>
            </div>
          </DropdownMenuCheckboxItem>
        ))}
        {selectedTypes.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelectedTypes([]);
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